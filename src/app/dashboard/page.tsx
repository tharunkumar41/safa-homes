'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Trash2 } from 'lucide-react';
import Header from '../Header';
import Reveal from '../Reveal';

interface Project {
  id: string;
  name: string;
  clientName: string | null;
  siteLength: number;
  siteBreadth: number;
  siteFacing: string;
  inputs: any;
  createdAt: string;
  updatedAt: string;
}

export default function DashboardPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNewProject, setShowNewProject] = useState(false);

  const [projectName, setProjectName] = useState('');
  const [clientName, setClientName] = useState('');
  const [siteLength, setSiteLength] = useState(30);
  const [siteBreadth, setSiteBreadth] = useState(40);
  const [siteFacing, setSiteFacing] = useState('North');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (session?.user?.name) {
      setClientName(session.user.name);
    }
  }, [session]);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/signin');
      return;
    }
    if (status === 'authenticated') {
      fetchProjects();
    }
  }, [status, router]);

  const fetchProjects = async () => {
    try {
      const res = await fetch('/api/projects');
      if (res.ok) {
        const data = await res.json();
        setProjects(data);
      }
    } catch (error) {
      console.error('Failed to fetch projects:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: projectName,
          clientName,
          siteLength,
          siteBreadth,
          siteFacing,
          inputs: {
            lengthFt: siteLength,
            breadthFt: siteBreadth,
            roadFacing: siteFacing,
            orientation: 'North',
            bedrooms: 3,
            bathrooms: 2,
            parking: true,
            garden: false,
            poojaRoom: true,
            vastu: true,
            floors: 1,
            kitchens: 1,
            servantQuarters: false,
          },
        }),
      });
      if (res.ok) {
        const project = await res.json();
        router.push(`/generator?projectId=${project.id}`);
      } else {
        throw new Error('Failed to create project');
      }
    } catch (error) {
      console.error('Create project error:', error);
      alert('Failed to create project. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const openProject = (projectId: string) => {
    router.push(`/generator?projectId=${projectId}`);
  };

  const handleDeleteProject = async (projectId: string) => {
    if (!confirm('Are you sure you want to delete this project? This action cannot be undone.')) {
      return;
    }
    try {
      const res = await fetch(`/api/projects/${projectId}`, { method: 'DELETE' });
      if (res.ok) {
        setProjects((prev) => prev.filter((p) => p.id !== projectId));
      } else {
        throw new Error('Failed to delete');
      }
    } catch (error) {
      console.error('Delete error:', error);
      alert('Failed to delete project. Please try again.');
    }
  };

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg)' }}>
        <div className="spinner" />
      </div>
    );
  }

  return (
    <div className="min-h-screen font-sans relative overflow-x-hidden" style={{ color: 'var(--text)' }}>
      <Header />
      <main className="max-w-6xl mx-auto px-6 py-16 md:py-24 relative z-10">
        <div className="flex items-center justify-between mb-12">
          <div>
            <h1 className="text-4xl font-display font-bold tracking-tight">
              Dashboard
            </h1>
            <p className="text-sm mt-2" style={{ color: 'var(--text-muted)' }}>
              Welcome back, <span className="text-accent">{session?.user?.name || session?.user?.email}</span>
            </p>
          </div>
          <button
            onClick={() => setShowNewProject(!showNewProject)}
            className="text-white font-bold text-sm px-6 py-3 rounded-full shadow-2xl transition-all glow-button"
            style={{ background: 'linear-gradient(90deg, var(--accent), color-mix(in srgb, var(--accent) 70%, var(--accent-2)))' }}
          >
            {showNewProject ? 'Cancel' : '+ New Project'}
          </button>
        </div>

        {showNewProject && (
          <Reveal className="mb-12">
            <div className="rounded-[32px] p-8 md:p-10 glass-panel">
              <h2 className="text-2xl font-display font-bold mb-6">Create New Project</h2>
              <form onSubmit={handleCreateProject} className="max-w-2xl space-y-5">
                <div className="grid md:grid-cols-2 gap-5">
                  <div className="space-y-1.5">
                    <label htmlFor="projectName" className="text-sm font-medium" style={{ color: 'var(--text)' }}>
                      Project Name <span className="text-red-400">*</span>
                    </label>
                    <input
                      id="projectName"
                      type="text"
                      value={projectName}
                      onChange={(e) => setProjectName(e.target.value)}
                      required
                      className="w-full px-4 py-3 rounded-xl bg-[var(--surface-solid)] border outline-none transition focus:ring-2 focus:ring-[var(--accent)] text-sm"
                      style={{ borderColor: 'var(--border)', color: 'var(--text)' }}
                      placeholder="e.g. Green Valley Villa"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label htmlFor="clientName" className="text-sm font-medium" style={{ color: 'var(--text)' }}>
                      Client Name <span className="text-xs" style={{ color: 'var(--text-muted)' }}>(optional – auto‑filled from your profile)</span>
                    </label>
                    <input
                      id="clientName"
                      type="text"
                      value={clientName}
                      onChange={(e) => setClientName(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl bg-[var(--surface-solid)] border outline-none transition focus:ring-2 focus:ring-[var(--accent)] text-sm"
                      style={{ borderColor: 'var(--border)', color: 'var(--text)' }}
                      placeholder="e.g. Mr. Rajesh Kumar"
                    />
                  </div>
                </div>
                <div className="grid md:grid-cols-3 gap-5">
                  <div className="space-y-1.5">
                    <label htmlFor="siteLength" className="text-sm font-medium" style={{ color: 'var(--text)' }}>
                      Length (ft) <span className="text-red-400">*</span>
                    </label>
                    <input
                      id="siteLength"
                      type="number"
                      min={15}
                      max={100}
                      value={siteLength}
                      onChange={(e) => setSiteLength(Number(e.target.value))}
                      required
                      className="w-full px-4 py-3 rounded-xl bg-[var(--surface-solid)] border outline-none transition focus:ring-2 focus:ring-[var(--accent)] text-sm"
                      style={{ borderColor: 'var(--border)', color: 'var(--text)' }}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label htmlFor="siteBreadth" className="text-sm font-medium" style={{ color: 'var(--text)' }}>
                      Breadth (ft) <span className="text-red-400">*</span>
                    </label>
                    <input
                      id="siteBreadth"
                      type="number"
                      min={15}
                      max={100}
                      value={siteBreadth}
                      onChange={(e) => setSiteBreadth(Number(e.target.value))}
                      required
                      className="w-full px-4 py-3 rounded-xl bg-[var(--surface-solid)] border outline-none transition focus:ring-2 focus:ring-[var(--accent)] text-sm"
                      style={{ borderColor: 'var(--border)', color: 'var(--text)' }}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label htmlFor="siteFacing" className="text-sm font-medium" style={{ color: 'var(--text)' }}>
                      Site Facing <span className="text-red-400">*</span>
                    </label>
                    <select
                      id="siteFacing"
                      value={siteFacing}
                      onChange={(e) => setSiteFacing(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl bg-[var(--surface-solid)] border outline-none transition focus:ring-2 focus:ring-[var(--accent)] text-sm appearance-none"
                      style={{ borderColor: 'var(--border)', color: 'var(--text)' }}
                    >
                      <option value="North" style={{ background: 'var(--surface-solid)', color: 'var(--text)' }}>North</option>
                      <option value="South" style={{ background: 'var(--surface-solid)', color: 'var(--text)' }}>South</option>
                      <option value="East" style={{ background: 'var(--surface-solid)', color: 'var(--text)' }}>East</option>
                      <option value="West" style={{ background: 'var(--surface-solid)', color: 'var(--text)' }}>West</option>
                    </select>
                  </div>
                </div>
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full text-white font-bold text-sm px-9 py-4 rounded-full shadow-2xl transition-all glow-button disabled:opacity-70 disabled:cursor-not-allowed"
                  style={{ background: 'linear-gradient(90deg, var(--accent), color-mix(in srgb, var(--accent) 70%, var(--accent-2)))' }}
                >
                  {submitting ? 'Creating…' : 'Create Project & Open Generator'}
                </button>
              </form>
            </div>
          </Reveal>
        )}

        <section>
          <h2 className="text-2xl font-display font-bold mb-6">Your Projects</h2>
          {projects.length === 0 ? (
            <div className="text-center py-16 glass-panel rounded-[32px]">
              <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                You don’t have any projects yet. Click <strong>“New Project”</strong> to get started.
              </p>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {projects.map((project) => (
                <div
                  key={project.id}
                  className="p-6 rounded-3xl glass-card cursor-pointer transition-transform hover:-translate-y-1 hover:shadow-xl relative group"
                  onClick={() => openProject(project.id)}
                >
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteProject(project.id);
                    }}
                    className="absolute top-3 right-3 p-1.5 rounded-full hover:bg-red-500/20 transition-colors opacity-0 group-hover:opacity-100"
                    style={{ color: 'var(--text-muted)' }}
                    aria-label="Delete project"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                  <h3 className="font-display font-semibold text-lg mb-1 pr-8">{project.name}</h3>
                  {project.clientName && (
                    <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                      Client: {project.clientName}
                    </p>
                  )}
                  <div className="mt-2 text-xs" style={{ color: 'var(--text-muted)' }}>
                    {project.siteLength} × {project.siteBreadth} ft · {project.siteFacing} facing
                  </div>
                  <p className="text-[10px] mt-3" style={{ color: 'var(--text-muted)' }}>
                    Updated {new Date(project.updatedAt).toLocaleDateString()}
                  </p>
                  <div className="mt-3 flex gap-2">
                    <span className="text-xs px-2 py-1 rounded-full bg-[var(--accent-soft)] text-[var(--accent)]">
                      Click to open
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>

      <footer className="max-w-6xl mx-auto px-6 pb-10 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs" style={{ color: 'var(--text-muted)' }}>
        <div className="flex items-center gap-2 font-display font-semibold" style={{ color: 'var(--text)' }}>
          <span className="w-2 h-2 rounded-full inline-block" style={{ background: 'var(--accent)' }} />
          SafaHomes
        </div>
        <div>© {new Date().getFullYear()} SafaHomes Studio. All drawings generated on the fly.</div>
      </footer>
    </div>
  );
}