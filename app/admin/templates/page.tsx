import { db } from "@/lib/db";
import { templates } from "@/lib/schema";
import { desc } from "drizzle-orm";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Plus, Palette, Check } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function TemplatesPage() {
  const allTemplates = await db.query.templates.findMany({
    orderBy: [desc(templates.createdAt)],
    with: { sections: true },
  });

  const templatesList = allTemplates.map((t) => ({
    ...t,
    _count: { sections: t.sections.length },
  }));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Templates</h1>
          <p className="text-muted-foreground">
            Customize your storefront appearance
          </p>
        </div>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Create Template
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {templatesList.map((template) => (
          <Card
            key={template.id}
            className={
              template.isActive
                ? "ring-2 ring-primary"
                : ""
            }
          >
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">{template.name}</CardTitle>
                {template.isActive && (
                  <Badge className="gap-1">
                    <Check className="h-3 w-3" />
                    Active
                  </Badge>
                )}
              </div>
              <CardDescription>
                {template.description || "No description"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="aspect-video bg-muted rounded-lg flex items-center justify-center mb-4">
                <Palette className="h-8 w-8 text-muted-foreground" />
              </div>
              <div className="flex items-center justify-between text-sm text-muted-foreground">
                <span>{template._count.sections} sections</span>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm">
                    Customize
                  </Button>
                  {!template.isActive && (
                    <Button size="sm">Activate</Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
        {templatesList.length === 0 && (
          <Card className="col-span-full">
            <CardContent className="py-12 text-center">
              <Palette className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No templates yet</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
