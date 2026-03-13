import { PageEnter, Reveal } from "@/components/site/motion";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { services } from "@/lib/site-data";

export default function ServicesPage() {
  return (
    <PageEnter>
      <Reveal>
        <h1 className="text-4xl font-semibold">Blog Topics</h1>
        <p className="mt-3 max-w-2xl text-slate-300">The technical domains covered in practical, deep-dive guides.</p>
      </Reveal>
      <div className="mt-8 grid gap-4 md:grid-cols-2">
        {services.map((item, idx) => (
          <Reveal key={item.title} delay={idx * 0.08}>
            <Card>
              <CardHeader>
                <CardTitle>{item.title}</CardTitle>
                <CardDescription>{item.description}</CardDescription>
              </CardHeader>
            </Card>
          </Reveal>
        ))}
      </div>
    </PageEnter>
  );
}
