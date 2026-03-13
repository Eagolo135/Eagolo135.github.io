import { PageEnter, Reveal } from "@/components/site/motion";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { posts } from "@/lib/site-data";

export default function BlogPage() {
  return (
    <PageEnter>
      <Reveal>
        <h1 className="text-4xl font-semibold">Latest Posts</h1>
        <p className="mt-3 max-w-2xl text-slate-300">Fresh write-ups on AI product engineering and web development.</p>
      </Reveal>
      <div className="mt-8 grid gap-4 md:grid-cols-2">
        {posts.map((post, idx) => (
          <Reveal key={post.title} delay={idx * 0.08}>
            <Card>
              <CardHeader>
                <CardDescription>{post.meta}</CardDescription>
                <CardTitle>{post.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="mb-3 text-sm text-slate-300">{post.excerpt}</p>
                <div className="flex flex-wrap gap-2">
                  {post.tags.map((tag) => (
                    <Badge key={tag} variant="secondary">{tag}</Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          </Reveal>
        ))}
      </div>
    </PageEnter>
  );
}
