import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { Upload, FileJson, FileText, Download, AlertCircle, CheckCircle2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

interface BulkImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImportComplete: () => void;
}

interface ImportResult {
  success: number;
  failed: number;
  errors: Array<{ row: number; error: string }>;
}

export const BulkImportDialog = ({ open, onOpenChange, onImportComplete }: BulkImportDialogProps) => {
  const [file, setFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<ImportResult | null>(null);

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
      title: item.title || item.Title,
      overview: item.overview || item.Overview || item.description,
      poster_path: item.poster_path || item.PosterPath || item.poster,
      backdrop_path: item.backdrop_path || item.BackdropPath || item.backdrop,
      content_type: (item.content_type || item.ContentType || item.type || 'movie').toLowerCase(),
      release_date: item.release_date || item.ReleaseDate || item.date || null,
      genre: item.genre || item.Genre || null,
      release_year: item.release_year || item.ReleaseYear || item.year || null,
      creator_director: item.creator_director || item.CreatorDirector || item.director || null,
      cast_members: item.cast_members || item.CastMembers || item.cast || null,
      tagline: item.tagline || item.Tagline || null,
      access_type: (item.access_type || item.AccessType || 'free').toLowerCase(),
      price: item.price ? Number(item.price) : 0,
      currency: item.currency || item.Currency || 'USD',
      seasons: item.seasons ? Number(item.seasons) : null,
      tmdb_id: item.tmdb_id ? Number(item.tmdb_id) : null,
      popularity: item.popularity ? Number(item.popularity) : null,
      status: item.status || 'active',
    }));
  };

  const handleImport = async () => {
    if (!file) {
      toast.error('Please select a file');
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

      // Parse file based on type
      if (file.name.endsWith('.csv')) {
        rawData = parseCSV(text);
      } else {
        rawData = JSON.parse(text);
        if (!Array.isArray(rawData)) {
          rawData = [rawData];
        }
      }

      // Validate and transform data
      const data = validateAndTransformData(rawData);

      // Import data in batches
      const batchSize = 10;
      for (let i = 0; i < data.length; i += batchSize) {
        const batch = data.slice(i, i + batchSize);
        
        try {
          const { error } = await supabase
            .from('content')
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
        toast.success(`Successfully imported ${successCount} items`);
        onImportComplete();
      }

      if (failedCount > 0) {
        toast.error(`Failed to import ${failedCount} items`);
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
      title: 'Example Movie',
      overview: 'Movie description',
      poster_path: 'https://example.com/poster.jpg',
      backdrop_path: 'https://example.com/backdrop.jpg',
      content_type: 'movie',
      release_date: '2024-01-01',
      genre: 'Action',
      release_year: '2024',
      creator_director: 'John Doe',
      cast_members: 'Actor 1, Actor 2',
      tagline: 'An amazing movie',
      access_type: 'free',
      price: 0,
      currency: 'USD',
      seasons: null,
      tmdb_id: 12345,
      popularity: 100.5,
      status: 'active',
    };

    let content: string;
    let mimeType: string;
    let filename: string;

    if (format === 'csv') {
      const headers = Object.keys(template).join(',');
      const values = Object.values(template).map(v => v === null ? '' : v).join(',');
      content = `${headers}\n${values}`;
      mimeType = 'text/csv';
      filename = 'content_import_template.csv';
    } else {
      content = JSON.stringify([template], null, 2);
      mimeType = 'application/json';
      filename = 'content_import_template.json';
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
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Bulk Import Content</DialogTitle>
          <DialogDescription>
            Upload a CSV or JSON file to import multiple movies/series at once
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
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
                disabled={importing}
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
                <span>Importing...</span>
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
                    <strong>Successful:</strong> {result.success} items
                  </AlertDescription>
                </Alert>
                {result.failed > 0 && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      <strong>Failed:</strong> {result.failed} items
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
              <li>• <strong>title</strong> - Content title (required)</li>
              <li>• <strong>content_type</strong> - "movie" or "series" (required)</li>
            </ul>
            <h4 className="font-semibold mt-3 mb-2 text-sm">Optional Fields:</h4>
            <ul className="text-sm space-y-1 text-muted-foreground">
              <li>• overview, poster_path, backdrop_path, genre, release_date</li>
              <li>• access_type: "free", "membership", or "purchase"</li>
              <li>• price, currency (for purchase type)</li>
              <li>• seasons (for series), tmdb_id, popularity, status</li>
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
              disabled={!file || importing}
            >
              <Upload className="h-4 w-4 mr-2" />
              {importing ? 'Importing...' : 'Import'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
