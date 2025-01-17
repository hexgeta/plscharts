import React from 'react';

const PrivacyPolicy: React.FC = () => {
  return (
    <div className="container mx-auto px-4 py-8">

      <main className="max-w-3xl mx-auto">
        <h1 className="text-4xl font-bold mb-8">Privacy Policy</h1>

        <div className="space-y-6">
          <section>
            <h2 className="text-2xl font-semibold mb-4">1. Collection of Information</h2>
            <p className="mb-4">
              We may collect various types of information when you use our website, including:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>
                <strong>Usage Information:</strong> We may collect information about how you use our website, such as your IP address, browser type, and operating system.
              </li>
              <li>
                <strong>Cookies:</strong> We may use cookies and similar tracking technologies to collect information about your browsing behavior on our website. You can control cookies through your browser settings.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">2. Use of Information</h2>
            <p className="mb-2">We may use the information we collect for various purposes, including:</p>
            <p>2.1. To provide and maintain our website.</p>
            <p>2.2. To comply with legal obligations.</p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">3. Disclosure of Information</h2>
            <p className="mb-2">We may share your information with:</p>
            <p>3.1. Third-party service providers who assist us in operating our website and providing our services.</p>
            <p>3.2. Legal authorities if required by law or to protect our rights, safety, or property.</p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">4. Security</h2>
            <p>
              We take reasonable measures to protect your information but cannot guarantee its absolute security.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">5. Changes to this Policy</h2>
            <p>
              We may update this Privacy Policy from time to time. The updated policy will be posted on this page.
            </p>
          </section>

          <p className="mt-8 font-semibold">
            By using our website, you acknowledge and agree to this Privacy Policy.
          </p>
        </div>
      </main>
    </div>
  );
};

export default PrivacyPolicy;
