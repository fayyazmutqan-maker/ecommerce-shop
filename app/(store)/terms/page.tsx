import Link from "next/link";
import { Breadcrumbs } from "@/components/store/breadcrumbs";
import { getLocale, getTranslations } from "next-intl/server";

export async function generateMetadata() {
  const t = await getTranslations("nav");
  return { title: t("terms") };
}

export default async function TermsPage() {
  const locale = await getLocale();
  const tNav = await getTranslations("nav");

  const dateStr = new Date().toLocaleDateString(
    locale === "ar" ? "ar-SA" : "en-US",
    { year: "numeric", month: "long", day: "numeric" }
  );

  if (locale === "ar") {
    return (
      <div className="max-w-4xl mx-auto px-6 lg:px-8 py-10 lg:py-14">
        <Breadcrumbs items={[{ label: tNav("terms") }]} />
        <article className="prose prose-neutral dark:prose-invert max-w-none">
          <h1>الشروط والأحكام</h1>
          <p className="lead">آخر تحديث: {dateStr}</p>

          <h2>1. المقدمة</h2>
          <p>مرحبًا بكم في ShopFlow. تحكم هذه الشروط والأحكام استخدامكم لموقعنا الإلكتروني وشراء المنتجات من متجرنا عبر الإنترنت. بالوصول إلى خدماتنا أو استخدامها، فإنكم توافقون على الالتزام بهذه الشروط.</p>

          <h2>2. الأهلية</h2>
          <p>يجب أن يكون عمرك 18 عامًا على الأقل أو أن تحصل على موافقة ولي الأمر لاستخدام خدماتنا. بإنشاء حساب، تؤكد أن المعلومات المقدمة دقيقة وكاملة.</p>

          <h2>3. المنتجات والأسعار</h2>
          <ul>
            <li>جميع الأسعار معروضة بالريال السعودي وتشمل ضريبة القيمة المضافة (15%).</li>
            <li>نحتفظ بالحق في تغيير الأسعار في أي وقت دون إشعار مسبق.</li>
            <li>توفر المنتجات عرضة للتغيير دون إشعار.</li>
            <li>نبذل قصارى جهدنا لعرض صور المنتجات والأوصاف بدقة.</li>
          </ul>

          <h2>4. الطلبات والدفع</h2>
          <ul>
            <li>يتم تأكيد الطلب فقط بعد معالجة الدفع بنجاح.</li>
            <li>نقبل الدفع عبر Tap Payments (بطاقات الائتمان/الخصم) والدفع عند الاستلام.</li>
            <li>نحتفظ بالحق في إلغاء الطلبات في حالة الاشتباه في الاحتيال.</li>
          </ul>

          <h2>5. الشحن والتوصيل</h2>
          <ul>
            <li>نوفر شحنًا مجانيًا للطلبات التي تزيد عن 200 ر.س.</li>
            <li>أوقات التوصيل تقديرية وقد تختلف حسب موقعك.</li>
            <li>ينتقل خطر الفقدان إلى العميل عند التسليم.</li>
          </ul>

          <h2>6. الإرجاع والاسترداد</h2>
          <p>يرجى الرجوع إلى{" "}<Link href="/returns" className="underline">سياسة الإرجاع</Link>{" "}للحصول على معلومات تفصيلية حول الإرجاع والاستبدال والاسترداد.</p>

          <h2>7. الملكية الفكرية</h2>
          <p>جميع المحتوى على هذا الموقع، بما في ذلك النصوص والصور والشعارات والرسومات، هي ملك لـ ShopFlow ومحمية بموجب قوانين الملكية الفكرية المعمول بها.</p>

          <h2>8. تحديد المسؤولية</h2>
          <p>لا تتحمل ShopFlow أي مسؤولية عن أي أضرار غير مباشرة أو عرضية أو تبعية ناتجة عن استخدام خدماتنا أو منتجاتنا.</p>

          <h2>9. القانون الحاكم</h2>
          <p>تخضع هذه الشروط لقوانين المملكة العربية السعودية. يتم حل أي نزاعات في المحاكم المختصة في الرياض.</p>

          <h2>10. اتصل بنا</h2>
          <p>للأسئلة حول هذه الشروط، يرجى التواصل معنا عبر{" "}<a href="mailto:support@shopflow.sa">support@shopflow.sa</a>.</p>
        </article>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-6 lg:px-8 py-10 lg:py-14">
      <Breadcrumbs items={[{ label: tNav("terms") }]} />

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
