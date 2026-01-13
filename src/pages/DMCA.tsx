import { ArrowLeft, Shield, AlertTriangle, FileText, Mail } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function DMCA() {
  const navigate = useNavigate();

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <Button variant="ghost" onClick={() => navigate(-1)} className="mb-6">
        <ArrowLeft className="h-4 w-4 mr-2" />
        Back
      </Button>

      <div className="flex items-center gap-3 mb-6">
        <Shield className="h-8 w-8 text-primary" />
        <h1 className="text-3xl font-bold">DMCA & Copyright Policy</h1>
      </div>

      <p className="text-muted-foreground mb-8">
        Last Updated: January 2024
      </p>

      <div className="prose prose-neutral dark:prose-invert max-w-none space-y-8">
        <section>
          <h2 className="text-2xl font-semibold mb-4">Our Commitment to Copyright</h2>
          <p className="text-muted-foreground leading-relaxed">
            KHMERZOON respects the intellectual property rights of others and expects our users to do the same. 
            We are committed to complying with the Digital Millennium Copyright Act (DMCA) and other applicable 
            copyright laws. We take copyright infringement seriously and will respond promptly to notices of 
            alleged copyright infringement that comply with applicable law.
          </p>
        </section>

        <Card className="border-yellow-500/50 bg-yellow-500/5">
          <CardContent className="p-6">
            <div className="flex gap-4">
              <AlertTriangle className="h-6 w-6 text-yellow-500 flex-shrink-0 mt-1" />
              <div>
                <h3 className="font-semibold mb-2">Important Notice</h3>
                <p className="text-sm text-muted-foreground">
                  If you believe that any content on KHMERZOON infringes your copyright, please follow the 
                  procedure outlined below to submit a DMCA takedown notice. We will investigate and take 
                  appropriate action in accordance with applicable law.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <section>
          <h2 className="text-2xl font-semibold mb-4">DMCA Takedown Procedure</h2>
          <p className="text-muted-foreground mb-4">
            If you are a copyright owner, or authorized to act on behalf of one, and you believe that 
            copyrighted work has been infringed, please report your notice of infringement to us by 
            providing the following information:
          </p>
          
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Required Information for DMCA Notice
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ol className="list-decimal list-inside space-y-3 text-muted-foreground">
                <li>
                  <strong className="text-foreground">Identification of the copyrighted work</strong> - 
                  A description of the copyrighted work that you claim has been infringed.
                </li>
                <li>
                  <strong className="text-foreground">Identification of the infringing material</strong> - 
                  A description of where the material that you claim is infringing is located on the website, 
                  with enough detail that we may find it (e.g., URL).
                </li>
                <li>
                  <strong className="text-foreground">Your contact information</strong> - 
                  Your name, address, telephone number, and email address.
                </li>
                <li>
                  <strong className="text-foreground">Good faith statement</strong> - 
                  A statement that you have a good faith belief that use of the material in the manner 
                  complained of is not authorized by the copyright owner, its agent, or the law.
                </li>
                <li>
                  <strong className="text-foreground">Accuracy statement</strong> - 
                  A statement that the information in the notification is accurate, and under penalty of 
                  perjury, that you are authorized to act on behalf of the owner of an exclusive right 
                  that is allegedly infringed.
                </li>
                <li>
                  <strong className="text-foreground">Signature</strong> - 
                  An electronic or physical signature of the copyright owner or a person authorized to 
                  act on their behalf.
                </li>
              </ol>
            </CardContent>
          </Card>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-4">How to Submit a DMCA Notice</h2>
          <Card className="bg-primary/5 border-primary/20">
            <CardContent className="p-6">
              <div className="flex items-start gap-4">
                <Mail className="h-6 w-6 text-primary flex-shrink-0 mt-1" />
                <div>
                  <h3 className="font-semibold mb-2">Contact Our DMCA Agent</h3>
                  <p className="text-muted-foreground mb-4">
                    Please send your DMCA takedown notice to our designated agent:
                  </p>
                  <div className="bg-background rounded-lg p-4 space-y-1 text-sm">
                    <p><strong>Email:</strong> dmca@khmerzoon.biz</p>
                    <p><strong>Subject Line:</strong> DMCA Takedown Notice</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-4">Counter-Notification Procedure</h2>
          <p className="text-muted-foreground leading-relaxed">
            If you believe that your content was removed or disabled by mistake or misidentification, 
            you may submit a counter-notification to our DMCA agent. Your counter-notification must include:
          </p>
          <ul className="list-disc list-inside space-y-2 text-muted-foreground mt-4">
            <li>Your physical or electronic signature</li>
            <li>Identification of the material that has been removed or disabled</li>
            <li>A statement under penalty of perjury that you have a good faith belief that the material 
                was removed or disabled as a result of mistake or misidentification</li>
            <li>Your name, address, and telephone number</li>
            <li>A statement that you consent to the jurisdiction of the federal district court for the 
                judicial district in which your address is located</li>
          </ul>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-4">Repeat Infringer Policy</h2>
          <p className="text-muted-foreground leading-relaxed">
            In accordance with the DMCA and other applicable law, KHMERZOON has adopted a policy of 
            terminating, in appropriate circumstances and at our sole discretion, users who are deemed 
            to be repeat infringers. We may also, at our sole discretion, limit access to the website 
            and/or terminate the accounts of any users who infringe any intellectual property rights 
            of others, whether or not there is any repeat infringement.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-4">Disclaimer</h2>
          <p className="text-muted-foreground leading-relaxed">
            The information provided on this page is for general informational purposes only and does 
            not constitute legal advice. If you have questions about your rights or the DMCA process, 
            please consult with a qualified attorney.
          </p>
        </section>

        <section className="border-t pt-8">
          <h2 className="text-2xl font-semibold mb-4">Related Policies</h2>
          <div className="flex flex-wrap gap-4">
            <Button variant="outline" onClick={() => navigate('/privacy-policy')}>
              Privacy Policy
            </Button>
            <Button variant="outline" onClick={() => navigate('/terms-of-service')}>
              Terms of Service
            </Button>
            <Button variant="outline" onClick={() => navigate('/contact')}>
              Contact Us
            </Button>
          </div>
        </section>
      </div>
    </div>
  );
}
