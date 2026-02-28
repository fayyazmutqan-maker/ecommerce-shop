import { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Terms & Conditions",
  description: "Terms and conditions for using our e-commerce platform.",
};

export default function TermsPage() {
  return (
    <div className="max-w-4xl mx-auto px-6 lg:px-8 py-10 lg:py-14">
      <nav className="flex items-center gap-2 text-sm text-muted-foreground mb-8">
        <Link href="/" className="hover:text-foreground transition-colors">
          Home
        </Link>
        <span className="text-muted-foreground/40">/</span>
        <span className="text-foreground font-medium">Terms & Conditions</span>
      </nav>

      <article className="prose prose-neutral dark:prose-invert max-w-none">
        <h1>Terms & Conditions</h1>
        <p className="lead">
          Last updated: {new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}
        </p>

        <h2>1. Introduction</h2>
        <p>
          Welcome to ShopFlow. These Terms & Conditions govern your use of our
          website and the purchase of products from our online store. By
          accessing or using our services, you agree to be bound by these terms.
        </p>

        <h2>2. Eligibility</h2>
        <p>
          You must be at least 18 years old or have parental consent to use our
          services. By creating an account, you confirm that the information
          provided is accurate and complete.
        </p>

        <h2>3. Products & Pricing</h2>
        <ul>
          <li>All prices are displayed in Saudi Riyals (SAR) and include applicable VAT (15%).</li>
          <li>We reserve the right to change prices at any time without prior notice.</li>
          <li>Product availability is subject to change without notice.</li>
          <li>We make every effort to display product images and descriptions accurately.</li>
        </ul>

        <h2>4. Orders & Payment</h2>
        <ul>
          <li>An order is confirmed only after successful payment processing.</li>
          <li>We accept payments via Tap Payments (credit/debit cards) and Cash on Delivery (COD).</li>
          <li>We reserve the right to cancel orders if fraud is suspected.</li>
        </ul>

        <h2>5. Shipping & Delivery</h2>
        <ul>
          <li>We offer free shipping on orders over SAR 200.</li>
          <li>Delivery times are estimates and may vary based on your location.</li>
          <li>Risk of loss transfers to the customer upon delivery.</li>
        </ul>

        <h2>6. Returns & Refunds</h2>
        <p>
          Please refer to our{" "}
          <Link href="/returns" className="underline">
            Return Policy
          </Link>{" "}
          for detailed information on returns, exchanges, and refunds.
        </p>

        <h2>7. Intellectual Property</h2>
        <p>
          All content on this website, including text, images, logos, and
          graphics, is the property of ShopFlow and is protected by applicable
          intellectual property laws.
        </p>

        <h2>8. Limitation of Liability</h2>
        <p>
          ShopFlow shall not be liable for any indirect, incidental, or
          consequential damages arising from the use of our services or products.
        </p>

        <h2>9. Governing Law</h2>
        <p>
          These terms are governed by the laws of the Kingdom of Saudi Arabia.
          Any disputes shall be resolved in the competent courts of Riyadh.
        </p>

        <h2>10. Contact</h2>
        <p>
          For questions about these terms, please contact us at{" "}
          <a href="mailto:support@shopflow.sa">support@shopflow.sa</a>.
        </p>
      </article>
    </div>
  );
}
