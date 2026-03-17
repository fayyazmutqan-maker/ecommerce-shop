import { Breadcrumbs } from "@/components/store/breadcrumbs";
import { getLocale, getTranslations } from "next-intl/server";

export async function generateMetadata() {
  const t = await getTranslations("nav");
  return { title: t("returns") };
}

export default async function ReturnsPage() {
  const locale = await getLocale();
  const tNav = await getTranslations("nav");

  const dateStr = new Date().toLocaleDateString(
    locale === "ar" ? "ar-SA" : "en-US",
    { year: "numeric", month: "long", day: "numeric" }
  );

  if (locale === "ar") {
    return (
      <div className="max-w-4xl mx-auto px-6 lg:px-8 py-10 lg:py-14">
        <Breadcrumbs items={[{ label: tNav("returns") }]} />
        <article className="prose prose-neutral dark:prose-invert max-w-none">
          <h1>سياسة الإرجاع والاسترداد</h1>
          <p className="lead">آخر تحديث: {dateStr}</p>

          <h2>1. أهلية الإرجاع</h2>
          <p>يمكنك إرجاع معظم المنتجات خلال 14 يومًا من التسليم، بشرط:</p>
          <ul>
            <li>أن يكون المنتج غير مستخدم وفي حالته الأصلية</li>
            <li>أن يكون المنتج في عبوته الأصلية</li>
            <li>أن يكون لديك الإيصال أو إثبات الشراء</li>
          </ul>

          <h2>2. المنتجات غير القابلة للإرجاع</h2>
          <p>لا يمكن إرجاع المنتجات التالية:</p>
          <ul>
            <li>بطاقات الهدايا</li>
            <li>المنتجات الرقمية/التنزيلات</li>
            <li>المنتجات المخصصة أو المصنوعة حسب الطلب</li>
            <li>المنتجات الشخصية أو الصحية</li>
            <li>المنتجات القابلة للتلف</li>
            <li>المنتجات المعروضة بالتخفيض النهائي</li>
          </ul>

          <h2>3. كيفية بدء الإرجاع</h2>
          <ol>
            <li>سجّل الدخول إلى حسابك واذهب إلى &quot;طلباتي&quot;</li>
            <li>اختر الطلب الذي يحتوي على المنتج(ات) التي ترغب بإرجاعها</li>
            <li>تواصل مع فريق الدعم على <a href="mailto:returns@shopflow.sa">returns@shopflow.sa</a></li>
            <li>اذكر رقم الطلب وسبب الإرجاع</li>
            <li>انتظر تفويض الإرجاع قبل إرسال المنتج</li>
          </ol>

          <h2>4. شحن الإرجاع</h2>
          <ul>
            <li>للمنتجات المعيبة أو الخاطئة: نتحمل تكاليف شحن الإرجاع</li>
            <li>لتغيير الرأي: يتحمل العميل تكاليف شحن الإرجاع</li>
            <li>يجب شحن المنتجات بطريقة شحن قابلة للتتبع</li>
          </ul>

          <h2>5. عملية الاسترداد</h2>
          <ul>
            <li>تتم معالجة المبالغ المستردة خلال 5-7 أيام عمل بعد استلامنا للمنتج المرتجع</li>
            <li>يتم إصدار المبلغ المسترد إلى طريقة الدفع الأصلية</li>
            <li>لطلبات الدفع عند الاستلام، تتم المبالغ المستردة عبر التحويل البنكي</li>
            <li>رسوم الشحن غير قابلة للاسترداد (ما لم يكن الإرجاع بسبب خطأ منا)</li>
          </ul>

          <h2>6. الاستبدال</h2>
          <p>نوفر استبدالًا مجانيًا للمنتجات المعيبة أو التالفة. لاستبدال المقاس أو اللون، يرجى بدء إرجاع وتقديم طلب جديد.</p>

          <h2>7. المنتجات التالفة أو المعيبة</h2>
          <p>إذا استلمت منتجًا تالفًا أو معيبًا، يرجى التواصل معنا خلال 48 ساعة من التسليم مع صور للتلف. سنرتب استبدالًا مجانيًا أو استردادًا كاملًا.</p>

          <h2>8. تأخر أو عدم استلام المبالغ المستردة</h2>
          <p>إذا لم تستلم المبلغ المسترد:</p>
          <ol>
            <li>تحقق من حسابك البنكي مرة أخرى</li>
            <li>تواصل مع البنك (تختلف أوقات المعالجة)</li>
            <li>تواصل معنا على <a href="mailto:support@shopflow.sa">support@shopflow.sa</a></li>
          </ol>

          <h2>9. اتصل بنا</h2>
          <p>للأسئلة المتعلقة بالإرجاع، راسلنا على{" "}<a href="mailto:returns@shopflow.sa">returns@shopflow.sa</a> أو اتصل بفريق خدمة العملاء.</p>
        </article>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-6 lg:px-8 py-10 lg:py-14">
      <Breadcrumbs items={[{ label: tNav("returns") }]} />

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
