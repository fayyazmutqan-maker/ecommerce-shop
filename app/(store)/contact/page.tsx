import { Card, CardContent } from "@/components/ui/card";
import { Mail, Phone, MapPin, Clock } from "lucide-react";
import { Breadcrumbs } from "@/components/store/breadcrumbs";
import { getTranslations } from "next-intl/server";
import { ContactForm } from "./contact-form";

export default async function ContactPage() {
  const t = await getTranslations("contactPage");
  const tContact = await getTranslations("contact");

  return (
    <div className="max-w-7xl mx-auto px-6 lg:px-8 py-10 lg:py-14">
      <Breadcrumbs items={[{ label: tContact("title") }]} />

      <div className="mb-10">
        <h1 className="text-3xl font-bold mb-2">{tContact("title")}</h1>
        <p className="text-muted-foreground max-w-2xl">
          {tContact("description")}
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          <ContactForm />
        </div>

        <div className="space-y-4">
          <Card>
            <CardContent className="pt-6 space-y-4">
              <div className="flex items-start gap-3">
                <Mail className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div>
                  <p className="font-medium text-sm">{t("emailLabel")}</p>
                  <p className="text-sm text-muted-foreground">support@shopflow.sa</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Phone className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div>
                  <p className="font-medium text-sm">{t("phoneLabel")}</p>
                  <p className="text-sm text-muted-foreground">+966 11 XXX XXXX</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <MapPin className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div>
                  <p className="font-medium text-sm">{t("addressLabel")}</p>
                  <p className="text-sm text-muted-foreground">Riyadh, Saudi Arabia</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Clock className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div>
                  <p className="font-medium text-sm">{t("businessHours")}</p>
                  <p className="text-sm text-muted-foreground">{t("sunThu")}</p>
                  <p className="text-sm text-muted-foreground">{t("friSat")}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
