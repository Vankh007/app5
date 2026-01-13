import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { Upload, FileJson, FileText, AlertCircle, CheckCircle2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

interface BulkImportEpisodesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImportComplete: () => void;
}

interface Series {
  id: string;
  title: string;
}

interface Season {
  id: string;
  season_number: number;
  title: string;
}

interface ImportResult {
  success: number;
  failed: number;
  errors: Array<{ row: number; error: string }>;
}

export const BulkImportEpisodesDialog = ({ open, onOpenChange, onImportComplete }: BulkImportEpisodesDialogProps) => {
  const [file, setFile] = useState<File | null>(null);
  const [series, setSeries] = useState<Series[]>([]);
  const [seasons, setSeasons] = useState<Season[]>([]);
  const [selectedSeriesId, setSelectedSeriesId] = useState<string>('');
  const [selectedSeasonId, setSelectedSeasonId] = useState<string>('');
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<ImportResult | null>(null);

  useEffect(() => {
    if (open) {
      fetchSeries();
    }
  }, [open]);

  useEffect(() => {
    if (selectedSeriesId) {
      fetchSeasons(selectedSeriesId);
    } else {
      setSeasons([]);
      setSelectedSeasonId('');
    }
  }, [selectedSeriesId]);

  const fetchSeries = async () => {
    try {
      const { data, error } = await supabase
        .from('content')
        .select('id, title')
        .eq('content_type', 'series')
        .order('title');

      if (error) throw error;
      setSeries(data || []);
    } catch (error) {
      console.error('Error fetching series:', error);
      toast.error('Failed to load series list');
    }
  };

  const fetchSeasons = async (seriesId: string) => {
    try {
      const { data, error } = await supabase
        .from('seasons')
        .select('id, season_number, title')
        .eq('show_id', seriesId)
        .order('season_number');

      if (error) throw error;
      setSeasons(data || []);
    } catch (error) {
      console.error('Error fetching seasons:', error);
      toast.error('Failed to load seasons');
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      const fileType = selectedFile.name.split('.').pop()?.toLowerCase();
      if (fileType === 'csv' || fileType === 'json') {
        setFile(selectedFile);
        setResult(null);
      } else {
        toast.error('Please upload a CSV or JSON file');
      }
    }
  };

  const parseCSV = (text: string): any[] => {
    const lines = text.trim().split('\n');
    const headers = lines[0].split(',').map(h => h.trim());
    
    return lines.slice(1).map(line => {
      const values = line.split(',').map(v => v.trim());
      const obj: any = {};
      headers.forEach((header, index) => {
        obj[header] = values[index] || null;
      });
      return obj;
    });
  };

  const validateAndTransformData = (data: any[]): any[] => {
    return data.map(item => ({
      show_id: selectedSeriesId,
      season_id: selectedSeasonId || null,
      title: item.title || item.Title,
      episode_number: item.episode_number ? Number(item.episode_number) : null,
      overview: item.overview || item.Overview || item.description,
      still_path: item.still_path || item.StillPath || item.thumbnail,
      air_date: item.air_date || item.AirDate || item.date || null,
      duration: item.duration ? Number(item.duration) : null,
      access_type: (item.access_type || item.AccessType || 'free').toLowerCase(),
      price: item.price ? Number(item.price) : 0,
      currency: item.currency || item.Currency || 'USD',
      version: item.version || null,
      tmdb_id: item.tmdb_id ? Number(item.tmdb_id) : null,
      vote_average: item.vote_average ? Number(item.vote_average) : null,
    }));
  };

  const handleImport = async () => {
    if (!file) {
      toast.error('Please select a file');
      return;
    }

    if (!selectedSeriesId) {
      toast.error('Please select a series');
      return;
    }

    setImporting(true);
    setProgress(0);
    const errors: Array<{ row: number; error: string }> = [];
    let successCount = 0;
    let failedCount = 0;

    try {
      const text = await file.text();
      let rawData: any[];

      if (file.name.endsWith('.csv')) {
        rawData = parseCSV(text);
      } else {
        rawData = JSON.parse(text);
        if (!Array.isArray(rawData)) {
          rawData = [rawData];
        }
      }

      const data = validateAndTransformData(rawData);

      const batchSize = 10;
      for (let i = 0; i < data.length; i += batchSize) {
        const batch = data.slice(i, i + batchSize);
        
        try {
          const { error } = await supabase
            .from('episodes')
            .insert(batch);

          if (error) {
            batch.forEach((_, idx) => {
              errors.push({
                row: i + idx + 2,
                error: error.message,
              });
              failedCount++;
            });
          } else {
            successCount += batch.length;
          }
        } catch (err: any) {
          batch.forEach((_, idx) => {
            errors.push({
              row: i + idx + 2,
              error: err.message || 'Unknown error',
            });
            failedCount++;
          });
        }

        setProgress(Math.round(((i + batch.length) / data.length) * 100));
      }

      setResult({
        success: successCount,
        failed: failedCount,
        errors,
      });

      if (successCount > 0) {
        toast.success(`Successfully imported ${successCount} episodes`);
        onImportComplete();
      }

      if (failedCount > 0) {
        toast.error(`Failed to import ${failedCount} episodes`);
      }
    } catch (error: any) {
      console.error('Import error:', error);
      toast.error('Failed to import file: ' + error.message);
    } finally {
      setImporting(false);
    }
  };

  const downloadTemplate = (format: 'csv' | 'json') => {
    const template = {
      title: 'Episode 1',
      episode_number: 1,
      overview: 'Episode description',
      still_path: 'https://example.com/episode-thumbnail.jpg',
      air_date: '2024-01-01',
      duration: 45,
      access_type: 'free',
      price: 0,
      currency: 'USD',
      version: 'original',
      tmdb_id: 12345,
      vote_average: 8.5,
    };

    let content: string;
    let mimeType: string;
    let filename: string;

    if (format === 'csv') {
      const headers = Object.keys(template).join(',');
      const values = Object.values(template).map(v => v === null ? '' : v).join(',');
      content = `${headers}\n${values}`;
      mimeType = 'text/csv';
      filename = 'episodes_import_template.csv';
    } else {
      content = JSON.stringify([template], null, 2);
      mimeType = 'application/json';
      filename = 'episodes_import_template.json';
    }

    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleClose = () => {
    setFile(null);
    setResult(null);
    setProgress(0);
    setSelectedSeriesId('');
    setSelectedSeasonId('');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Bulk Import Episodes</DialogTitle>
          <DialogDescription>
            Upload a CSV or JSON file to import multiple episodes for a series
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Series Selection */}
          <div>
            <Label htmlFor="series-select" className="mb-2 block">
              Select Series *
            </Label>
            <Select
              value={selectedSeriesId}
              onValueChange={setSelectedSeriesId}
              disabled={importing}
            >
              <SelectTrigger id="series-select">
                <SelectValue placeholder="Choose a series..." />
              </SelectTrigger>
              <SelectContent>
                {series.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Season Selection (Optional) */}
          {selectedSeriesId && seasons.length > 0 && (
            <div>
              <Label htmlFor="season-select" className="mb-2 block">
                Select Season (Optional)
              </Label>
              <Select
                value={selectedSeasonId}
                onValueChange={setSelectedSeasonId}
                disabled={importing}
              >
                <SelectTrigger id="season-select">
                  <SelectValue placeholder="Choose a season (optional)..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">No specific season</SelectItem>
                  {seasons.map((season) => (
                    <SelectItem key={season.id} value={season.id}>
                      Season {season.season_number}: {season.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Download Templates */}
          <div>
            <Label className="mb-2 block">Download Template</Label>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => downloadTemplate('csv')}
              >
                <FileText className="h-4 w-4 mr-2" />
                CSV Template
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => downloadTemplate('json')}
              >
                <FileJson className="h-4 w-4 mr-2" />
                JSON Template
              </Button>
            </div>
          </div>

          {/* File Upload */}
          <div>
            <Label htmlFor="file-upload" className="mb-2 block">
              Upload File
            </Label>
            <div className="flex items-center gap-2">
              <Input
                id="file-upload"
                type="file"
                accept=".csv,.json"
                onChange={handleFileChange}
                disabled={importing || !selectedSeriesId}
              />
              {file && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setFile(null)}
                  disabled={importing}
                >
                  Clear
                </Button>
              )}
            </div>
            {file && (
              <p className="text-sm text-muted-foreground mt-2">
                Selected: {file.name}
              </p>
            )}
          </div>

          {/* Import Progress */}
          {importing && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span>Importing episodes...</span>
                <span>{progress}%</span>
              </div>
              <Progress value={progress} />
            </div>
          )}

          {/* Results */}
          {result && (
            <div className="space-y-4">
              <div className="flex gap-4">
                <Alert>
                  <CheckCircle2 className="h-4 w-4" />
                  <AlertDescription>
                    <strong>Successful:</strong> {result.success} episodes
                  </AlertDescription>
                </Alert>
                {result.failed > 0 && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      <strong>Failed:</strong> {result.failed} episodes
                    </AlertDescription>
                  </Alert>
                )}
              </div>

              {result.errors.length > 0 && (
                <div className="border rounded-md p-4 max-h-48 overflow-y-auto">
                  <h4 className="font-semibold mb-2">Errors:</h4>
                  <ul className="space-y-1 text-sm">
                    {result.errors.map((err, idx) => (
                      <li key={idx} className="text-destructive">
                        Row {err.row}: {err.error}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {/* Field Guide */}
          <div className="border rounded-md p-4 bg-muted/50">
            <h4 className="font-semibold mb-2 text-sm">Required Fields:</h4>
            <ul className="text-sm space-y-1 text-muted-foreground">
              <li>• <strong>title</strong> - Episode title (required)</li>
              <li>• <strong>episode_number</strong> - Episode number (required)</li>
            </ul>
            <h4 className="font-semibold mt-3 mb-2 text-sm">Optional Fields:</h4>
            <ul className="text-sm space-y-1 text-muted-foreground">
              <li>• overview, still_path, air_date, duration (in minutes)</li>
              <li>• access_type: "free", "membership", or "purchase"</li>
              <li>• price, currency (for purchase type)</li>
              <li>• version, tmdb_id, vote_average</li>
            </ul>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={importing}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleImport}
              disabled={!file || !selectedSeriesId || importing}
            >
              <Upload className="h-4 w-4 mr-2" />
              {importing ? 'Importing...' : 'Import Episodes'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
