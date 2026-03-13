export const site = {
  name: "NeuralForge AI Journal",
  title: "NeuralForge AI Journal",
  tagline: "Futuristic AI engineering, dark-mode product design, and production build logs.",
  about:
    "I am an AI engineer and full-stack developer documenting real build systems, autonomous workflows, and high-performance product architecture.",
  email: "nicholasnelson1203@gmail.com",
  phone: "+1-862-224-7718",
  bookingLink: "https://cal.com/nicholas-nelson-vwn6zc/30min",
  formspreeEndpoint: "https://formspree.io/f/xpqjpvgn",
  images: {
    hero: "https://images.unsplash.com/photo-1516110833967-0b5716ca1387?auto=format&fit=crop&w=1500&q=80",
    about: "https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?auto=format&fit=crop&w=1400&q=80",
    projects: "https://images.unsplash.com/photo-1555066931-4365d14bab8c?auto=format&fit=crop&w=1400&q=80",
  },
};

export const navItems = [
  { label: "Home", href: "/" },
  { label: "Blog", href: "/blog" },
  { label: "Services", href: "/services" },
  { label: "Projects", href: "/projects" },
  { label: "Contact", href: "/contact" },
  { label: "Book", href: "/book" },
  { label: "Dashboard", href: "/dashboard" },
];

export const services = [
  {
    title: "AI Strategy and Consulting",
    description: "Frameworks for selecting use cases, evaluating model tradeoffs, and setting implementation roadmaps.",
  },
  {
    title: "Machine Learning Solutions",
    description: "Model design, training, evaluation, and deployment patterns for practical product teams.",
  },
  {
    title: "Natural Language Processing",
    description: "RAG pipelines, prompt strategy, eval harnesses, and LLM application architecture for production systems.",
  },
  {
    title: "Computer Vision",
    description: "Visual AI use-cases, multimodal pipelines, and edge-friendly deployment approaches.",
  },
];

export const posts = [
  {
    title: "Building a Production-Ready RAG Stack with Node.js and Postgres",
    excerpt: "A practical walkthrough of chunking, retrieval quality, observability, and latency optimization for real-world RAG systems.",
    meta: "2026-03-01 - 8 min read",
    tags: ["AI", "RAG", "Node.js", "PostgreSQL"],
  },
  {
    title: "Designing Futuristic Dark-Mode UI Systems for AI Products",
    excerpt: "Build high-contrast interfaces with neon accents that stay accessible, fast, and conversion-focused.",
    meta: "2026-02-24 - 6 min read",
    tags: ["UI", "Design System", "CSS", "Accessibility"],
  },
  {
    title: "Feature Flags for AI Products",
    excerpt: "Release AI features progressively, isolate model changes, and ship with confidence using robust flag strategies.",
    meta: "2026-02-16 - 7 min read",
    tags: ["AI Ops", "Feature Flags", "Product Engineering"],
  },
];

export const projects = [
  {
    title: "E-commerce Recommendation Engine",
    description: "Personalized recommendation system that improved conversion and average order value.",
    stack: ["Python", "TensorFlow", "AWS", "PyTorch"],
  },
  {
    title: "Customer Support Chatbot",
    description: "NLP assistant that handled most support inquiries automatically.",
    stack: ["Python", "OpenAI API", "LangChain", "React"],
  },
  {
    title: "Predictive Maintenance System",
    description: "ML system to forecast equipment failure and reduce manufacturing downtime.",
    stack: ["Python", "Scikit-learn", "Azure ML", "Docker"],
  },
];

export const faqs = [
  {
    question: "Is the consultation really free?",
    answer: "Yes. The initial 30-minute consultation is free with no obligation.",
  },
  {
    question: "What should I prepare for the call?",
    answer: "Bring your business goals and current bottlenecks. We can map technical options together.",
  },
  {
    question: "Do you work with businesses of all sizes?",
    answer: "Yes. Engagements are scoped to your team size, timeline, and budget.",
  },
];
