import { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Return & Refund Policy",
  description: "Our return and refund policy for products purchased from our store.",
};

export default function ReturnsPage() {
  return (
    <div className="max-w-4xl mx-auto px-6 lg:px-8 py-10 lg:py-14">
      <nav className="flex items-center gap-2 text-sm text-muted-foreground mb-8">
        <Link href="/" className="hover:text-foreground transition-colors">
          Home
        </Link>
        <span className="text-muted-foreground/40">/</span>
        <span className="text-foreground font-medium">Return & Refund Policy</span>
      </nav>

      <article className="prose prose-neutral dark:prose-invert max-w-none">
        <h1>Return & Refund Policy</h1>
        <p className="lead">
          Last updated: {new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}
        </p>

        <h2>1. Return Eligibility</h2>
        <p>You may return most items within 14 days of delivery, provided:</p>
        <ul>
          <li>The item is unused and in its original condition</li>
          <li>The item is in its original packaging</li>
          <li>You have the receipt or proof of purchase</li>
        </ul>

        <h2>2. Non-Returnable Items</h2>
        <p>The following items cannot be returned:</p>
        <ul>
          <li>Gift cards</li>
          <li>Digital products/downloads</li>
          <li>Personalized or custom-made items</li>
          <li>Intimate or sanitary goods</li>
          <li>Perishable goods</li>
          <li>Items marked as final sale</li>
        </ul>

        <h2>3. How to Initiate a Return</h2>
        <ol>
          <li>Log in to your account and go to &quot;My Orders&quot;</li>
          <li>Select the order containing the item(s) you wish to return</li>
          <li>Contact our support team at <a href="mailto:returns@shopflow.sa">returns@shopflow.sa</a></li>
          <li>Include your order number and reason for return</li>
          <li>Wait for return authorization before shipping the item back</li>
        </ol>

        <h2>4. Return Shipping</h2>
        <ul>
          <li>For defective or incorrect items: We cover return shipping costs</li>
          <li>For change of mind: Customer is responsible for return shipping costs</li>
          <li>Items must be shipped with a trackable shipping method</li>
        </ul>

        <h2>5. Refund Process</h2>
        <ul>
          <li>Refunds will be processed within 5-7 business days after we receive the returned item</li>
          <li>Refunds will be issued to the original payment method</li>
          <li>For COD orders, refunds will be processed via bank transfer</li>
          <li>Shipping fees are non-refundable (unless the return is due to our error)</li>
        </ul>

        <h2>6. Exchanges</h2>
        <p>
          We offer free exchanges for defective or damaged items. For size or
          color exchanges, please initiate a return and place a new order.
        </p>

        <h2>7. Damaged or Defective Items</h2>
        <p>
          If you receive a damaged or defective item, please contact us within
          48 hours of delivery with photos of the damage. We will arrange a
          free replacement or full refund.
        </p>

        <h2>8. Late or Missing Refunds</h2>
        <p>If you haven&apos;t received your refund:</p>
        <ol>
          <li>Check your bank account again</li>
          <li>Contact your bank (processing times vary)</li>
          <li>Contact us at <a href="mailto:support@shopflow.sa">support@shopflow.sa</a></li>
        </ol>

        <h2>9. Contact</h2>
        <p>
          For return-related questions, email us at{" "}
          <a href="mailto:returns@shopflow.sa">returns@shopflow.sa</a> or call
          our customer service team.
        </p>
      </article>
    </div>
  );
}
