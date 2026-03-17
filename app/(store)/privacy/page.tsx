import { Breadcrumbs } from "@/components/store/breadcrumbs";
import { getLocale, getTranslations } from "next-intl/server";

export async function generateMetadata() {
  const t = await getTranslations("nav");
  return { title: t("privacy") };
}

export default async function PrivacyPage() {
  const locale = await getLocale();
  const tNav = await getTranslations("nav");

  const dateStr = new Date().toLocaleDateString(
    locale === "ar" ? "ar-SA" : "en-US",
    { year: "numeric", month: "long", day: "numeric" }
  );

  if (locale === "ar") {
    return (
      <div className="max-w-4xl mx-auto px-6 lg:px-8 py-10 lg:py-14">
        <Breadcrumbs items={[{ label: tNav("privacy") }]} />
        <article className="prose prose-neutral dark:prose-invert max-w-none">
          <h1>سياسة الخصوصية</h1>
          <p className="lead">آخر تحديث: {dateStr}</p>

          <h2>1. المعلومات التي نجمعها</h2>
          <h3>المعلومات الشخصية</h3>
          <ul>
            <li>الاسم والبريد الإلكتروني ورقم الهاتف</li>
            <li>عناوين الفوترة والشحن</li>
            <li>معلومات الدفع (تتم معالجتها بأمان عبر Tap Payments)</li>
            <li>بيانات اعتماد الحساب</li>
          </ul>

          <h3>المعلومات المجمعة تلقائيًا</h3>
          <ul>
            <li>عنوان IP ونوع المتصفح ومعلومات الجهاز</li>
            <li>الصفحات المزارة ووقت وتاريخ الزيارات</li>
            <li>ملفات تعريف الارتباط وتقنيات التتبع المماثلة</li>
          </ul>

          <h2>2. كيف نستخدم معلوماتك</h2>
          <ul>
            <li>لمعالجة وتنفيذ طلباتك</li>
            <li>للتواصل معك بشأن الطلبات والمنتجات والخدمات</li>
            <li>لتحسين موقعنا وتجربة العملاء</li>
            <li>لاكتشاف ومنع الاحتيال</li>
            <li>للامتثال للالتزامات القانونية</li>
          </ul>

          <h2>3. مشاركة المعلومات</h2>
          <p>لا نبيع معلوماتك الشخصية. قد نشارك بياناتك مع:</p>
          <ul>
            <li>معالجي الدفع (Tap Payments) لمعالجة المعاملات</li>
            <li>شركاء الشحن والتوصيل</li>
            <li>جهات إنفاذ القانون عند الاقتضاء</li>
          </ul>

          <h2>4. أمان البيانات</h2>
          <p>ننفذ التدابير التقنية والتنظيمية المناسبة لحماية بياناتك الشخصية، بما في ذلك التشفير والخوادم الآمنة وضوابط الوصول.</p>

          <h2>5. ملفات تعريف الارتباط</h2>
          <p>نستخدم ملفات تعريف الارتباط لتحسين تجربة التصفح وتحليل حركة المرور وتخصيص المحتوى. يمكنك إدارة تفضيلات ملفات تعريف الارتباط من خلال إعدادات المتصفح.</p>

          <h2>6. حقوقك</h2>
          <p>بموجب نظام حماية البيانات الشخصية السعودي، لديك الحق في:</p>
          <ul>
            <li>الوصول إلى بياناتك الشخصية</li>
            <li>طلب تصحيح البيانات غير الدقيقة</li>
            <li>طلب حذف بياناتك</li>
            <li>الاعتراض على معالجة بياناتك</li>
            <li>نقل البيانات</li>
          </ul>

          <h2>7. الاحتفاظ بالبيانات</h2>
          <p>نحتفظ ببياناتك الشخصية طالما كان ذلك ضروريًا لتحقيق الأغراض الموضحة في هذه السياسة، ما لم يكن القانون يتطلب فترة احتفاظ أطول.</p>

          <h2>8. روابط الأطراف الثالثة</h2>
          <p>قد يحتوي موقعنا على روابط لمواقع أطراف ثالثة. نحن غير مسؤولين عن ممارسات الخصوصية لتلك المواقع.</p>

          <h2>9. التغييرات على هذه السياسة</h2>
          <p>قد نقوم بتحديث سياسة الخصوصية هذه من وقت لآخر. سنبلغكم بالتغييرات الجوهرية بنشر السياسة الجديدة على هذه الصفحة.</p>

          <h2>10. اتصل بنا</h2>
          <p>للاستفسارات المتعلقة بالخصوصية، يرجى التواصل معنا عبر{" "}<a href="mailto:privacy@shopflow.sa">privacy@shopflow.sa</a>.</p>
        </article>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-6 lg:px-8 py-10 lg:py-14">
      <Breadcrumbs items={[{ label: tNav("privacy") }]} />

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
