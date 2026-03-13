import Link from "next/link";

import { PageEnter, Reveal } from "@/components/site/motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { faqs, site } from "@/lib/site-data";

export default function BookPage() {
  return (
    <PageEnter>
      <Reveal>
        <h1 className="text-4xl font-semibold">Book a Consultation</h1>
        <p className="mt-3 max-w-2xl text-slate-300">Let's explore how AI can drive your business success.</p>
      </Reveal>

      <Reveal delay={0.1} className="mt-8">
        <Card>
          <CardHeader>
            <CardTitle>Free 30-Minute Consultation</CardTitle>
          </CardHeader>
          <CardContent>
            <Button asChild>
              <a href={site.bookingLink} target="_blank" rel="noreferrer">
                Schedule Now
              </a>
            </Button>
          </CardContent>
        </Card>
      </Reveal>

      <div className="mt-8 grid gap-4">
        {faqs.map((faq, idx) => (
          <Reveal key={faq.question} delay={idx * 0.06}>
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">{faq.question}</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-slate-300">{faq.answer}</CardContent>
            </Card>
          </Reveal>
        ))}
      </div>

      <Reveal delay={0.2} className="mt-8">
        <Button asChild variant="outline">
          <Link href="/contact">Prefer to Email Instead?</Link>
        </Button>
      </Reveal>
    </PageEnter>
  );
}
