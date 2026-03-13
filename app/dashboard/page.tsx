import Link from "next/link";

import { PageEnter, Reveal } from "@/components/site/motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function DashboardPage() {
  return (
    <PageEnter>
      <Reveal>
        <h1 className="text-4xl font-semibold">Creator Dashboard</h1>
        <p className="mt-3 max-w-2xl text-slate-300">
          Use this section as your publishing and content operations control panel.
        </p>
      </Reveal>
      <Reveal delay={0.1} className="mt-8">
        <Card>
          <CardHeader>
            <CardTitle>Next Steps</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-slate-300">
            <p>Wire this page to your CMS, database, or auth provider to manage posts and projects.</p>
            <Button asChild>
              <Link href="/contact">Contact for Implementation</Link>
            </Button>
          </CardContent>
        </Card>
      </Reveal>
    </PageEnter>
  );
}
