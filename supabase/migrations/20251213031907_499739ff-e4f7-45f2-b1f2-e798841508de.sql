-- Insert default content for AdSense-compliant pages
INSERT INTO public.content_sections (section_key, title, content, is_active)
VALUES 
(
  'privacy_policy',
  'Privacy Policy',
  '<section>
    <h2 class="text-xl font-semibold mb-3">1. Introduction</h2>
    <p class="text-muted-foreground leading-relaxed mb-6">
      Welcome to KHMERZOON. We respect your privacy and are committed to protecting your personal data. This privacy policy will inform you about how we look after your personal data when you visit our website and tell you about your privacy rights and how the law protects you.
    </p>
  </section>

  <section>
    <h2 class="text-xl font-semibold mb-3">2. Information We Collect</h2>
    <p class="text-muted-foreground leading-relaxed mb-3">We may collect, use, store and transfer different kinds of personal data about you:</p>
    <ul class="list-disc list-inside text-muted-foreground space-y-2 mb-6">
      <li><strong>Identity Data:</strong> includes first name, last name, username or similar identifier.</li>
      <li><strong>Contact Data:</strong> includes email address and telephone numbers.</li>
      <li><strong>Technical Data:</strong> includes internet protocol (IP) address, browser type and version, time zone setting, browser plug-in types and versions, operating system and platform.</li>
      <li><strong>Usage Data:</strong> includes information about how you use our website and services.</li>
      <li><strong>Profile Data:</strong> includes your username and password, your interests, preferences, feedback and survey responses.</li>
    </ul>
  </section>

  <section>
    <h2 class="text-xl font-semibold mb-3">3. How We Use Your Information</h2>
    <p class="text-muted-foreground leading-relaxed mb-3">We use your personal data for the following purposes:</p>
    <ul class="list-disc list-inside text-muted-foreground space-y-2 mb-6">
      <li>To provide and maintain our service</li>
      <li>To notify you about changes to our service</li>
      <li>To allow you to participate in interactive features of our service</li>
      <li>To provide customer support</li>
      <li>To gather analysis or valuable information to improve our service</li>
      <li>To monitor the usage of our service</li>
      <li>To detect, prevent and address technical issues</li>
    </ul>
  </section>

  <section>
    <h2 class="text-xl font-semibold mb-3">4. Cookies and Tracking Technologies</h2>
    <p class="text-muted-foreground leading-relaxed mb-6">
      We use cookies and similar tracking technologies to track the activity on our service and hold certain information. Cookies are files with small amount of data which may include an anonymous unique identifier. You can instruct your browser to refuse all cookies or to indicate when a cookie is being sent.
    </p>
  </section>

  <section>
    <h2 class="text-xl font-semibold mb-3">5. Third-Party Advertising</h2>
    <p class="text-muted-foreground leading-relaxed mb-6">
      We use third-party advertising companies, including Google AdSense, to serve ads when you visit our website. These companies may use information about your visits to this and other websites to provide advertisements about goods and services of interest to you. Google, as a third-party vendor, uses cookies to serve ads on our site. You may opt out of personalized advertising by visiting Google Ads Settings.
    </p>
  </section>

  <section>
    <h2 class="text-xl font-semibold mb-3">6. Data Security</h2>
    <p class="text-muted-foreground leading-relaxed mb-6">
      We have implemented appropriate security measures to prevent your personal data from being accidentally lost, used or accessed in an unauthorized way. We limit access to your personal data to those employees, agents, contractors and other third parties who have a business need to know.
    </p>
  </section>

  <section>
    <h2 class="text-xl font-semibold mb-3">7. Your Rights</h2>
    <p class="text-muted-foreground leading-relaxed mb-3">Under certain circumstances, you have rights under data protection laws in relation to your personal data:</p>
    <ul class="list-disc list-inside text-muted-foreground space-y-2 mb-6">
      <li>Request access to your personal data</li>
      <li>Request correction of your personal data</li>
      <li>Request erasure of your personal data</li>
      <li>Object to processing of your personal data</li>
      <li>Request restriction of processing your personal data</li>
      <li>Request transfer of your personal data</li>
    </ul>
  </section>

  <section>
    <h2 class="text-xl font-semibold mb-3">8. Contact Us</h2>
    <p class="text-muted-foreground leading-relaxed">
      If you have any questions about this Privacy Policy, please contact us at: <a href="mailto:support@khmerzoon.biz" class="text-primary hover:underline">support@khmerzoon.biz</a>
    </p>
  </section>',
  true
),
(
  'terms_of_service',
  'Terms of Service',
  '<section>
    <h2 class="text-xl font-semibold mb-3">1. Acceptance of Terms</h2>
    <p class="text-muted-foreground leading-relaxed mb-6">
      By accessing and using KHMERZOON, you accept and agree to be bound by the terms and provisions of this agreement. If you do not agree to abide by these terms, please do not use this service.
    </p>
  </section>

  <section>
    <h2 class="text-xl font-semibold mb-3">2. Use License</h2>
    <p class="text-muted-foreground leading-relaxed mb-3">Permission is granted to temporarily access the materials on KHMERZOON for personal, non-commercial transitory viewing only. This is the grant of a license, not a transfer of title, and under this license you may not:</p>
    <ul class="list-disc list-inside text-muted-foreground space-y-2 mb-6">
      <li>Modify or copy the materials</li>
      <li>Use the materials for any commercial purpose or for any public display</li>
      <li>Attempt to decompile or reverse engineer any software contained on KHMERZOON</li>
      <li>Remove any copyright or other proprietary notations from the materials</li>
      <li>Transfer the materials to another person or mirror the materials on any other server</li>
    </ul>
  </section>

  <section>
    <h2 class="text-xl font-semibold mb-3">3. User Account</h2>
    <p class="text-muted-foreground leading-relaxed mb-6">
      To access certain features of the service, you may be required to create an account. You are responsible for maintaining the confidentiality of your account credentials and for all activities that occur under your account. You agree to notify us immediately of any unauthorized use of your account.
    </p>
  </section>

  <section>
    <h2 class="text-xl font-semibold mb-3">4. Content Guidelines</h2>
    <p class="text-muted-foreground leading-relaxed mb-3">Users agree not to upload, post, or transmit any content that:</p>
    <ul class="list-disc list-inside text-muted-foreground space-y-2 mb-6">
      <li>Is unlawful, harmful, threatening, abusive, harassing, defamatory, or invasive of privacy</li>
      <li>Infringes any patent, trademark, trade secret, copyright, or other proprietary rights</li>
      <li>Contains software viruses or any other code designed to disrupt or damage systems</li>
      <li>Constitutes unauthorized advertising, spam, or other forms of solicitation</li>
    </ul>
  </section>

  <section>
    <h2 class="text-xl font-semibold mb-3">5. Intellectual Property</h2>
    <p class="text-muted-foreground leading-relaxed mb-6">
      The content, arrangement, and layout of this site, including but not limited to, the trademarks, photos, logos, videos, and text are proprietary to KHMERZOON and are protected by intellectual property laws. Unauthorized use of these materials may violate copyright, trademark, and other laws.
    </p>
  </section>

  <section>
    <h2 class="text-xl font-semibold mb-3">6. Third-Party Links and Advertisements</h2>
    <p class="text-muted-foreground leading-relaxed mb-6">
      KHMERZOON may contain links to third-party websites and advertisements served by third parties, including Google AdSense. We are not responsible for the content, privacy policies, or practices of any third-party sites or services. Your interactions with third-party advertisements are solely between you and the advertiser.
    </p>
  </section>

  <section>
    <h2 class="text-xl font-semibold mb-3">7. Disclaimer</h2>
    <p class="text-muted-foreground leading-relaxed mb-6">
      The materials on KHMERZOON are provided on an "as is" basis. KHMERZOON makes no warranties, expressed or implied, and hereby disclaims and negates all other warranties including, without limitation, implied warranties or conditions of merchantability, fitness for a particular purpose, or non-infringement of intellectual property.
    </p>
  </section>

  <section>
    <h2 class="text-xl font-semibold mb-3">8. Limitation of Liability</h2>
    <p class="text-muted-foreground leading-relaxed mb-6">
      In no event shall KHMERZOON or its suppliers be liable for any damages (including, without limitation, damages for loss of data or profit, or due to business interruption) arising out of the use or inability to use the materials on KHMERZOON.
    </p>
  </section>

  <section>
    <h2 class="text-xl font-semibold mb-3">9. Modifications</h2>
    <p class="text-muted-foreground leading-relaxed mb-6">
      KHMERZOON may revise these terms of service at any time without notice. By using this website, you are agreeing to be bound by the then-current version of these terms of service.
    </p>
  </section>

  <section>
    <h2 class="text-xl font-semibold mb-3">10. Contact Us</h2>
    <p class="text-muted-foreground leading-relaxed">
      If you have any questions about these Terms, please contact us at: <a href="mailto:support@khmerzoon.biz" class="text-primary hover:underline">support@khmerzoon.biz</a>
    </p>
  </section>',
  true
),
(
  'about_us',
  'About Us',
  '<section>
    <h2 class="text-xl font-semibold mb-3">Who We Are</h2>
    <p class="text-muted-foreground leading-relaxed mb-6">
      KHMERZOON is a premier streaming platform dedicated to bringing the best entertainment content to audiences worldwide. Our mission is to provide high-quality movies, TV series, and exclusive content that entertains, inspires, and connects people across cultures.
    </p>
  </section>

  <section>
    <h2 class="text-xl font-semibold mb-3">Our Mission</h2>
    <p class="text-muted-foreground leading-relaxed mb-6">
      We believe in the power of storytelling to unite people and create memorable experiences. Our platform is built on the foundation of providing accessible, diverse, and engaging content for viewers of all ages and backgrounds.
    </p>
  </section>

  <section>
    <h2 class="text-xl font-semibold mb-3">What We Offer</h2>
    <ul class="list-disc list-inside text-muted-foreground space-y-2 mb-6">
      <li><strong>Extensive Library:</strong> Thousands of movies and TV series across multiple genres</li>
      <li><strong>High-Quality Streaming:</strong> Crystal clear video quality for the best viewing experience</li>
      <li><strong>Multi-Device Support:</strong> Watch on your phone, tablet, computer, or TV</li>
      <li><strong>Regular Updates:</strong> New content added regularly to keep you entertained</li>
      <li><strong>User-Friendly Interface:</strong> Easy navigation and personalized recommendations</li>
    </ul>
  </section>

  <section>
    <h2 class="text-xl font-semibold mb-3">Our Values</h2>
    <ul class="list-disc list-inside text-muted-foreground space-y-2 mb-6">
      <li><strong>Quality:</strong> We are committed to delivering the highest quality content and user experience</li>
      <li><strong>Diversity:</strong> We celebrate diverse stories and perspectives from around the world</li>
      <li><strong>Innovation:</strong> We continuously improve our platform with the latest technology</li>
      <li><strong>Community:</strong> We value our users and strive to build a vibrant community of entertainment lovers</li>
    </ul>
  </section>

  <section>
    <h2 class="text-xl font-semibold mb-3">Contact Us</h2>
    <p class="text-muted-foreground leading-relaxed mb-3">We would love to hear from you! Whether you have questions, feedback, or suggestions, feel free to reach out:</p>
    <ul class="list-none text-muted-foreground space-y-2">
      <li><strong>Email:</strong> <a href="mailto:support@khmerzoon.biz" class="text-primary hover:underline">support@khmerzoon.biz</a></li>
      <li><strong>Website:</strong> <a href="https://khmerzoon.biz" class="text-primary hover:underline">www.khmerzoon.biz</a></li>
    </ul>
  </section>',
  true
),
(
  'contact',
  'Contact Us',
  '<section>
    <h2 class="text-xl font-semibold mb-3">Get in Touch</h2>
    <p class="text-muted-foreground leading-relaxed mb-6">
      We are here to help! If you have any questions, concerns, or feedback, please do not hesitate to contact us using the information below.
    </p>
  </section>

  <section>
    <h2 class="text-xl font-semibold mb-3">Contact Information</h2>
    <ul class="list-none text-muted-foreground space-y-3 mb-6">
      <li><strong>Email:</strong> <a href="mailto:support@khmerzoon.biz" class="text-primary hover:underline">support@khmerzoon.biz</a></li>
      <li><strong>Website:</strong> <a href="https://khmerzoon.biz" class="text-primary hover:underline">www.khmerzoon.biz</a></li>
    </ul>
  </section>

  <section>
    <h2 class="text-xl font-semibold mb-3">Business Hours</h2>
    <p class="text-muted-foreground leading-relaxed mb-6">
      Our support team is available Monday through Friday, 9:00 AM to 6:00 PM (GMT+7). We strive to respond to all inquiries within 24-48 hours.
    </p>
  </section>

  <section>
    <h2 class="text-xl font-semibold mb-3">Feedback</h2>
    <p class="text-muted-foreground leading-relaxed">
      Your feedback is valuable to us! It helps us improve our service and provide you with a better experience. Please share your thoughts, suggestions, or report any issues you encounter.
    </p>
  </section>',
  true
)
ON CONFLICT (section_key) DO UPDATE SET
  title = EXCLUDED.title,
  content = EXCLUDED.content,
  is_active = EXCLUDED.is_active,
  updated_at = now();