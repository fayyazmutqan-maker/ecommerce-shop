import { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "Our privacy policy explains how we collect, use, and protect your personal information.",
};

export default function PrivacyPage() {
  return (
    <div className="max-w-4xl mx-auto px-6 lg:px-8 py-10 lg:py-14">
      <nav className="flex items-center gap-2 text-sm text-muted-foreground mb-8">
        <Link href="/" className="hover:text-foreground transition-colors">
          Home
        </Link>
        <span className="text-muted-foreground/40">/</span>
        <span className="text-foreground font-medium">Privacy Policy</span>
      </nav>

      <article className="prose prose-neutral dark:prose-invert max-w-none">
        <h1>Privacy Policy</h1>
        <p className="lead">
          Last updated: {new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}
        </p>

        <h2>1. Information We Collect</h2>
        <h3>Personal Information</h3>
        <ul>
          <li>Name, email address, phone number</li>
          <li>Billing and shipping addresses</li>
          <li>Payment information (processed securely via Tap Payments)</li>
          <li>Account credentials</li>
        </ul>

        <h3>Automatically Collected Information</h3>
        <ul>
          <li>IP address, browser type, device information</li>
          <li>Pages visited, time and date of visits</li>
          <li>Cookies and similar tracking technologies</li>
        </ul>

        <h2>2. How We Use Your Information</h2>
        <ul>
          <li>To process and fulfill your orders</li>
          <li>To communicate with you about orders, products, and services</li>
          <li>To improve our website and customer experience</li>
          <li>To detect and prevent fraud</li>
          <li>To comply with legal obligations</li>
        </ul>

        <h2>3. Information Sharing</h2>
        <p>
          We do not sell your personal information. We may share your data with:
        </p>
        <ul>
          <li>Payment processors (Tap Payments) to process transactions</li>
          <li>Shipping and delivery partners</li>
          <li>Law enforcement when required by law</li>
        </ul>

        <h2>4. Data Security</h2>
        <p>
          We implement appropriate technical and organizational measures to
          protect your personal data, including encryption, secure servers, and
          access controls.
        </p>

        <h2>5. Cookies</h2>
        <p>
          We use cookies to enhance your browsing experience, analyze site
          traffic, and personalize content. You can manage cookie preferences
          through your browser settings.
        </p>

        <h2>6. Your Rights</h2>
        <p>Under the Saudi Personal Data Protection Law (PDPL), you have the right to:</p>
        <ul>
          <li>Access your personal data</li>
          <li>Request correction of inaccurate data</li>
          <li>Request deletion of your data</li>
          <li>Object to processing of your data</li>
          <li>Data portability</li>
        </ul>

        <h2>7. Data Retention</h2>
        <p>
          We retain your personal data for as long as necessary to fulfill the
          purposes outlined in this policy, unless a longer retention period is
          required by law.
        </p>

        <h2>8. Third-Party Links</h2>
        <p>
          Our website may contain links to third-party websites. We are not
          responsible for the privacy practices of those websites.
        </p>

        <h2>9. Changes to This Policy</h2>
        <p>
          We may update this Privacy Policy from time to time. We will notify
          you of significant changes by posting the new policy on this page.
        </p>

        <h2>10. Contact Us</h2>
        <p>
          For privacy-related inquiries, please contact us at{" "}
          <a href="mailto:privacy@shopflow.sa">privacy@shopflow.sa</a>.
        </p>
      </article>
    </div>
  );
}
