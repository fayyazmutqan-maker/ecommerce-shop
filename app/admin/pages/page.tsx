import { db } from "@/lib/db";
import { pages } from "@/lib/schema";
import { desc } from "drizzle-orm";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent } from "@/components/ui/card";
import { FileText } from "lucide-react";
import { formatDate } from "@/lib/helpers";
import { PageCreateButton, PageEditButton, PageDeleteButton } from "@/components/admin/page-dialog";

export const dynamic = "force-dynamic";

export default async function PagesAdminPage() {
  const allPages = await db.query.pages.findMany({
    orderBy: [desc(pages.createdAt)],
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Pages</h1>
          <p className="text-muted-foreground">
            Manage your store&apos;s content pages
          </p>
        </div>
        <PageCreateButton />
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Title</TableHead>
                <TableHead>URL</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Last Updated</TableHead>
                <TableHead className="w-20">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {allPages.map((page) => (
                <TableRow key={page.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">{page.title}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    /{page.slug}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={page.isPublished ? "default" : "secondary"}
                    >
                      {page.isPublished ? "Published" : "Draft"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {formatDate(page.updatedAt)}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <PageEditButton page={{ id: page.id, title: page.title, slug: page.slug, content: page.content ?? "", isPublished: page.isPublished, metaTitle: page.seoTitle ?? null, metaDescription: page.seoDescription ?? null }} />
                      <PageDeleteButton pageId={page.id} title={page.title} />
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {allPages.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8">
                    <p className="text-muted-foreground">No pages yet</p>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
