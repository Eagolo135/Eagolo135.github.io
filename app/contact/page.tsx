import { Mail, Phone } from "lucide-react";

import { PageEnter, Reveal } from "@/components/site/motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { site } from "@/lib/site-data";

export default function ContactPage() {
  return (
    <PageEnter>
      <Reveal>
        <h1 className="text-4xl font-semibold">Get in Touch</h1>
        <p className="mt-3 max-w-2xl text-slate-300">Let's discuss how AI can transform your business.</p>
      </Reveal>

      <div className="mt-8 grid gap-5 md:grid-cols-[1.3fr_1fr]">
        <Reveal>
          <Card>
            <CardHeader>
              <CardTitle>Send a Message</CardTitle>
            </CardHeader>
            <CardContent>
              <form action={site.formspreeEndpoint} method="POST" className="space-y-3">
                <Input name="name" placeholder="Your name" required />
                <Input name="email" type="email" placeholder="your.email@example.com" required />
                <Textarea name="message" placeholder="Tell me about your project..." required />
                <Button type="submit">Send Message</Button>
              </form>
            </CardContent>
          </Card>
        </Reveal>

        <Reveal delay={0.1}>
          <Card>
            <CardHeader>
              <CardTitle>Contact Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm text-slate-300">
              <p className="flex items-center gap-2"><Mail className="h-4 w-4" /> {site.email}</p>
              <p className="flex items-center gap-2"><Phone className="h-4 w-4" /> {site.phone}</p>
            </CardContent>
          </Card>
        </Reveal>
      </div>
    </PageEnter>
  );
}
