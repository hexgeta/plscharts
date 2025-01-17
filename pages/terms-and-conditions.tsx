import React from 'react';
import Head from 'next/head';

const TermsAndConditions: React.FC = () => {
  return (
    <div className="container mx-auto px-4 py-8">
      <Head>
        <title>Terms and Conditions - YourSiteName</title>
        <meta name="description" content="Terms and Conditions for YourSiteName" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <main className="max-w-3xl mx-auto">
        <h1 className="text-4xl font-bold mb-8">Terms and Conditions</h1>

        <div className="space-y-6">
          <p>
            These Terms and Conditions ("Terms") govern your use of the YourSiteName Site (the "Site") operated by YourSiteName ("we," "us," or "our"). By accessing or using the Site, you agree to comply with and be bound by these Terms. If you do not agree with these Terms, please do not use the Site.
          </p>

          <section>
            <h2 className="text-2xl font-semibold mb-4">1. Acceptance of Terms</h2>
            <p>
              By accessing or using the Site, you acknowledge that you have read, understood, and agree to be bound by these Terms. We reserve the right to modify or revise these Terms at any time without notice. It is your responsibility to review these Terms periodically to ensure you are aware of any changes.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">2. Use of the Site</h2>
            <p>2.1. You must be at least 18 years old to use the Site.</p>
            <p>2.2. You agree to use the Site for lawful purposes only and in compliance with all applicable laws and regulations.</p>
            <p>2.3. You are solely responsible for maintaining the confidentiality of your account credentials and for all activities that occur under your account.</p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">3. Content and Services</h2>
            <p>3.1. The Site provides information and analytics related to cryptocurrencies and does not constitute financial advice. You are solely responsible for any investment decisions you make based on information obtained from the Site.</p>
            <p>3.2. We may, at our discretion, change or discontinue any part of the Site or its services without notice.</p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">4. User Conduct</h2>
            <p>4.1. You agree not to engage in any of the following prohibited activities:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>a) Violating any applicable laws or regulations.</li>
              <li>b) Impersonating any person or entity or falsely claiming an affiliation with any entity.</li>
              <li>c) Uploading, posting, or transmitting any content that is harmful, offensive, or violates the rights of others.</li>
              <li>d) Attempting to interfere with the proper functioning of the Site.</li>
            </ul>
          </section>

          {/* Add more sections here for the remaining terms */}

          <p className="mt-8 font-semibold">
            By using the Site, you acknowledge and agree to these Terms and any updates or modifications thereof. These Terms constitute the entire agreement between you and us regarding your use of the Site.
          </p>
        </div>
      </main>
    </div>
  );
};

export default TermsAndConditions;
