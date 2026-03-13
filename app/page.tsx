import Image from "next/image";
import Link from "next/link";

import { PageEnter, Reveal } from "@/components/site/motion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { posts, services, site } from "@/lib/site-data";

export default function HomePage() {
  return (
    <PageEnter>
      <section className="grid gap-8 pb-12 md:grid-cols-[1.1fr_1fr] md:items-center">
        <Reveal>
          <Badge variant="secondary" className="mb-4">Futuristic AI Publication</Badge>
          <h1 className="text-4xl font-semibold tracking-tight text-white md:text-6xl">{site.name}</h1>
          <p className="mt-5 max-w-xl text-base text-slate-300 md:text-lg">{site.tagline}</p>
          <div className="mt-7 flex flex-wrap gap-3">
            <Button asChild>
              <Link href="/blog">Read the Blog</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/dashboard">Open Dashboard</Link>
            </Button>
          </div>
        </Reveal>
        <Reveal delay={0.1}>
          <div className="glass relative overflow-hidden rounded-2xl p-2">
            <Image
              src={site.images.hero}
              alt="AI workspace"
              width={1200}
              height={800}
              className="h-[340px] w-full rounded-xl object-cover"
              priority
            />
          </div>
        </Reveal>
      </section>

      <section className="space-y-5 pb-12">
        <Reveal>
          <h2 className="text-3xl font-semibold">Why This Blog Exists</h2>
          <p className="max-w-3xl text-slate-300">{site.about}</p>
        </Reveal>
      </section>

      <section className="pb-12">
        <Reveal>
          <h2 className="mb-4 text-3xl font-semibold">Core Topics</h2>
        </Reveal>
        <div className="grid gap-4 md:grid-cols-2">
          {services.map((service, idx) => (
            <Reveal key={service.title} delay={idx * 0.08}>
              <Card>
                <CardHeader>
                  <CardTitle>{service.title}</CardTitle>
                  <CardDescription>{service.description}</CardDescription>
                </CardHeader>
              </Card>
            </Reveal>
          ))}
        </div>
      </section>

      <section>
        <Reveal>
          <h2 className="mb-4 text-3xl font-semibold">Latest Posts</h2>
        </Reveal>
        <div className="grid gap-4 md:grid-cols-3">
          {posts.map((post, idx) => (
            <Reveal key={post.title} delay={idx * 0.08}>
              <Card>
                <CardHeader>
                  <CardDescription>{post.meta}</CardDescription>
                  <CardTitle className="text-xl">{post.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-slate-300">{post.excerpt}</p>
                </CardContent>
              </Card>
            </Reveal>
          ))}
        </div>
      </section>
    </PageEnter>
  );
}
