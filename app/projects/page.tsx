import { PageEnter, Reveal } from "@/components/site/motion";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { projects } from "@/lib/site-data";

export default function ProjectsPage() {
  return (
    <PageEnter>
      <Reveal>
        <h1 className="text-4xl font-semibold">Projects</h1>
        <p className="mt-3 max-w-2xl text-slate-300">Products, experiments, and production systems.</p>
      </Reveal>
      <div className="mt-8 grid gap-4 md:grid-cols-2">
        {projects.map((project, idx) => (
          <Reveal key={project.title} delay={idx * 0.08}>
            <Card>
              <CardHeader>
                <CardTitle>{project.title}</CardTitle>
                <CardDescription>{project.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {project.stack.map((tech) => (
                    <Badge key={tech} variant="secondary">{tech}</Badge>
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
