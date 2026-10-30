'use client';

import * as React from 'react';
import {
  X,
  Plus,
  FolderGit2,
  ExternalLink,
  GitBranch,
  Tag,
  Code,
  Trash2,
  Sparkles,
  Users,
  Search,
  Filter,
  Laptop,
  CheckCircle2,
  AlertCircle,
  Share2,
} from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import { api } from '@/lib/api-client';
import { ProjectDTO, CreateProjectInput } from '@mivo/shared';
import { useRouter } from 'next/navigation';

export interface ProjectsHubModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectAuthor?: (authorId: string) => void;
}

const POPULAR_TAGS = ['All', 'React', 'TypeScript', 'Next.js', 'AI', 'Node.js', 'Rust', 'Tailwind', 'Realtime'];

export const ProjectsHubModal: React.FC<ProjectsHubModalProps> = ({
  isOpen,
  onClose,
  onSelectAuthor,
}) => {
  const router = useRouter();
  const { user, isGuest, isNonOrg, isOrg, setUpgradeModalOpen } = useAuthStore();
  const [projects, setProjects] = React.useState<ProjectDTO[]>([]);
  const [isLoading, setIsLoading] = React.useState(false);
  const [selectedTag, setSelectedTag] = React.useState('All');
  const [searchQuery, setSearchQuery] = React.useState('');
  const [isPublishingOpen, setIsPublishingOpen] = React.useState(false);
  const [activeSnippetProject, setActiveSnippetProject] = React.useState<ProjectDTO | null>(null);

  // Form state
  const [title, setTitle] = React.useState('');
  const [description, setDescription] = React.useState('');
  const [demoUrl, setDemoUrl] = React.useState('');
  const [githubUrl, setGithubUrl] = React.useState('');
  const [tagsInput, setTagsInput] = React.useState('');
  const [language, setLanguage] = React.useState('typescript');
  const [codeSnippet, setCodeSnippet] = React.useState('');
  const [formError, setFormError] = React.useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const fetchProjects = React.useCallback(async () => {
    setIsLoading(true);
    try {
      const tagParam = selectedTag && selectedTag !== 'All' ? `?tag=${encodeURIComponent(selectedTag)}` : '';
      const res = await api.get<ProjectDTO[]>(`/api/v1/projects${tagParam}`);
      if (res.success && res.data) {
        setProjects(res.data);
      }
    } catch (err) {
      console.error('Failed to fetch projects:', err);
    } finally {
      setIsLoading(false);
    }
  }, [selectedTag]);

  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (activeSnippetProject) {
          setActiveSnippetProject(null);
        } else if (isPublishingOpen) {
          setIsPublishingOpen(false);
        } else {
          onClose();
        }
      }
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, activeSnippetProject, isPublishingOpen, onClose]);

  React.useEffect(() => {
    if (isOpen) {
      fetchProjects();
    }
  }, [isOpen, fetchProjects]);

  if (!isOpen) return null;

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isGuest) {
      setUpgradeModalOpen(true);
      return;
    }
    if (!title.trim() || !description.trim()) {
      setFormError('Please provide a project title and description.');
      return;
    }

    setIsSubmitting(true);
    setFormError(null);

    const tags = tagsInput
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);

    const input: CreateProjectInput = {
      title: title.trim(),
      description: description.trim(),
      demoUrl: demoUrl.trim() || undefined,
      githubUrl: githubUrl.trim() || undefined,
      tags,
      language: language.trim() || 'typescript',
      codeSnippet: codeSnippet.trim() || undefined,
    };

    try {
      const res = await api.post<ProjectDTO>('/api/v1/projects', input);
      if (res.success && res.data) {
        const newProj = res.data;
        setProjects((prev) => [newProj, ...prev]);
        setIsPublishingOpen(false);
        setTitle('');
        setDescription('');
        setDemoUrl('');
        setGithubUrl('');
        setTagsInput('');
        setCodeSnippet('');
      } else {
        setFormError('Failed to publish project.');
      }
    } catch (err: any) {
      setFormError(err.message || 'An error occurred while publishing project.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteProject = async (projectId: string) => {
    if (!confirm('Are you sure you want to delete this project?')) return;
    try {
      await api.delete(`/api/v1/projects/${projectId}`);
      setProjects((prev) => prev.filter((p) => p.id !== projectId));
    } catch (err: any) {
      alert(err.message || 'Failed to delete project');
    }
  };

  const filteredProjects = projects.filter((p) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      p.title.toLowerCase().includes(q) ||
      p.description.toLowerCase().includes(q) ||
      p.tags.some((t) => t.toLowerCase().includes(q)) ||
      p.authorDisplayName.toLowerCase().includes(q) ||
      p.authorUsername.toLowerCase().includes(q)
    );
  });

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="projects-hub-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-fadeIn"
    >
      <div className="w-full max-w-4xl bg-[var(--bg-surface-0)] border border-[var(--border-subtle)] rounded-2xl shadow-[0_24px_80px_rgba(0,0,0,0.6),inset_0_1px_0_rgba(255,255,255,0.06)] overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--border-subtle)] bg-[var(--bg-surface-1)] flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[var(--brand-primary,#dc2626)] flex items-center justify-center text-white shadow-xs">
              <FolderGit2 className="w-5 h-5 stroke-[2.2]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 id="projects-hub-title" className="text-base font-bold text-[var(--text-primary)] font-display">
                  Developer Project Showcase
                </h3>
                <span className="px-2 py-0.5 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-700 dark:text-cyan-300 text-[10px] font-bold">
                  Creator & Dev Hub
                </span>
              </div>
              <p className="text-xs text-[var(--text-secondary)]">
                Discover independent software projects, inspect live code, and collaborate in real-time
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                if (isGuest) {
                  setUpgradeModalOpen(true);
                } else {
                  setIsPublishingOpen(true);
                }
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[var(--brand-primary,#dc2626)] hover:brightness-105 active:scale-[0.98] text-white font-semibold text-xs shadow-xs transition-all cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
              <span>{isGuest ? 'Upgrade to Publish' : 'Publish Project'}</span>
            </button>
            <button
              onClick={onClose}
              aria-label="Close dialog"
              className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface-2)] transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Guest restriction reminder banner */}
        {isGuest && (
          <div className="px-6 py-2 bg-amber-500/10 border-b border-amber-500/20 flex items-center justify-between text-xs text-amber-800 dark:text-amber-300">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-amber-500 flex-shrink-0" />
              <span>
                <strong>Guest Mode:</strong> You can browse public projects and read developer code. To publish your projects and collaborate with live code sharing, claim a developer account.
              </span>
            </div>
            <button
              onClick={() => setUpgradeModalOpen(true)}
              className="font-semibold underline text-amber-700 dark:text-amber-300 hover:opacity-80 cursor-pointer ml-3 whitespace-nowrap"
            >
              Claim Account
            </button>
          </div>
        )}

        {/* Search & Tags Bar */}
        <div className="px-6 py-3 border-b border-[var(--border-subtle)] bg-[var(--bg-surface-0)] flex flex-wrap items-center justify-between gap-3 flex-shrink-0">
          <div className="flex items-center gap-1.5 overflow-x-auto py-1 scrollbar-none max-w-full">
            {POPULAR_TAGS.map((tag) => (
              <button
                key={tag}
                onClick={() => setSelectedTag(tag)}
                className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  selectedTag === tag
                    ? 'bg-[var(--brand-primary,#dc2626)] text-white shadow-xs'
                    : 'bg-[var(--bg-surface-1)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface-2)] border border-[var(--border-subtle)]'
                }`}
              >
                {tag}
              </button>
            ))}
          </div>

          <div className="relative min-w-[220px]">
            <Search className="w-3.5 h-3.5 text-[var(--text-muted)] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search title, tech, author..."
              className="w-full pl-8 pr-3 py-1.5 rounded-lg bg-[var(--bg-surface-1)] border border-[var(--border-subtle)] text-xs text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--brand-primary,#dc2626)]"
            />
          </div>
        </div>

        {/* Projects Grid */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {isLoading ? (
            <div className="py-20 text-center flex flex-col items-center gap-3">
              <div className="w-8 h-8 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" />
              <span className="text-xs text-[var(--text-secondary)]">Loading developer projects...</span>
            </div>
          ) : filteredProjects.length === 0 ? (
            <div className="py-20 text-center flex flex-col items-center justify-center">
              <div className="w-14 h-14 rounded-2xl bg-[var(--bg-surface-1)] border border-[var(--border-subtle)] flex items-center justify-center text-cyan-400 mb-3">
                <FolderGit2 className="w-7 h-7 stroke-[1.5]" />
              </div>
              <h4 className="text-sm font-bold text-[var(--text-primary)]">No projects found</h4>
              <p className="text-xs text-[var(--text-muted)] max-w-sm mt-1">
                {searchQuery
                  ? 'No projects matched your search criteria.'
                  : 'Be the first creator to publish your open-source application or live demo.'}
              </p>
              {!isGuest && (
                <button
                  onClick={() => setIsPublishingOpen(true)}
                  className="mt-4 px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs shadow-md transition-all cursor-pointer"
                >
                  Publish Your First Project
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredProjects.map((p) => {
                const isAuthor = user?.id === p.authorId;
                return (
                  <div
                    key={p.id}
                    className="p-5 rounded-2xl bg-[var(--bg-surface-1)] border border-[var(--border-subtle)] hover:border-cyan-500/40 transition-all flex flex-col justify-between group shadow-sm hover:shadow-md"
                  >
                    <div>
                      {/* Top Author & Date Header */}
                      <div className="flex items-center justify-between pb-3 border-b border-[var(--border-subtle)] mb-3">
                        <div
                          className="flex items-center gap-2 cursor-pointer hover:opacity-80 transition-opacity"
                          onClick={() => onSelectAuthor?.(p.authorId)}
                        >
                          {p.authorAvatarUrl ? (
                            <img
                              src={p.authorAvatarUrl}
                              alt={p.authorDisplayName}
                              className="w-6 h-6 rounded-full object-cover"
                            />
                          ) : (
                            <div className="w-6 h-6 rounded-full bg-[var(--bg-surface-2)] border border-[var(--border-subtle)] text-[var(--text-primary)] text-[10px] font-bold flex items-center justify-center">
                              {p.authorDisplayName.slice(0, 1).toUpperCase()}
                            </div>
                          )}
                          <div className="leading-tight">
                            <span className="text-xs font-bold text-[var(--text-primary)] block">
                              {p.authorDisplayName}
                            </span>
                            <span className="text-[10px] text-[var(--text-muted)]">@{p.authorUsername}</span>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5">
                          {isAuthor && (
                            <button
                              onClick={() => handleDeleteProject(p.id)}
                              className="p-1 rounded-md text-[var(--text-muted)] hover:text-red-400 hover:bg-red-500/10 transition-colors cursor-pointer"
                              title="Delete project"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                          <span className="text-[10px] text-[var(--text-muted)]">
                            {new Date(p.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                      </div>

                      {/* Title & Description */}
                      <h4 className="text-sm font-bold text-[var(--text-primary)] font-display group-hover:text-cyan-400 transition-colors">
                        {p.title}
                      </h4>
                      <p className="text-xs text-[var(--text-secondary)] mt-1.5 line-clamp-3 leading-relaxed">
                        {p.description}
                      </p>

                      {/* Tags */}
                      {p.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-3">
                          {p.tags.map((tag) => (
                            <span
                              key={tag}
                              className="px-2 py-0.5 rounded-md bg-[var(--bg-surface-2)] text-[10px] font-medium text-[var(--text-secondary)] border border-[var(--border-subtle)]"
                            >
                              #{tag}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Bottom Actions */}
                    <div className="mt-4 pt-3 border-t border-[var(--border-subtle)] flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {p.githubUrl && (
                          <a
                            href={p.githubUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1.5 rounded-lg bg-[var(--bg-surface-2)] text-[var(--text-secondary)] hover:text-white hover:bg-zinc-700/50 transition-colors"
                            title="GitHub Repository"
                          >
                            <GitBranch className="w-3.5 h-3.5" />
                          </a>
                        )}
                        {p.demoUrl && (
                          <a
                            href={p.demoUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-cyan-600/20 text-cyan-300 hover:bg-cyan-600/30 text-[11px] font-semibold border border-cyan-500/30 transition-colors"
                          >
                            <ExternalLink className="w-3 h-3" />
                            <span>Live Demo</span>
                          </a>
                        )}
                        {p.codeSnippet && (
                          <button
                            onClick={() => setActiveSnippetProject(p)}
                            className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[var(--bg-surface-2)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] text-[11px] font-semibold transition-colors cursor-pointer"
                          >
                            <Code className="w-3 h-3" />
                            <span>Snippet</span>
                          </button>
                        )}
                      </div>

                      {/* Live Code Collaboration Button for Non-Org/Org */}
                      {!isGuest ? (
                        <button
                          onClick={() => {
                            onClose();
                            router.push('/rooms');
                          }}
                          className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-600/20 text-emerald-300 hover:bg-emerald-600/30 text-[11px] font-semibold border border-emerald-500/30 transition-colors cursor-pointer"
                          title="Open live sharing code room"
                        >
                          <Laptop className="w-3 h-3" />
                          <span>Live Code</span>
                        </button>
                      ) : (
                        <button
                          onClick={() => setUpgradeModalOpen(true)}
                          className="text-[10px] text-amber-400 font-semibold hover:underline"
                        >
                          Upgrade to collaborate
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Code Snippet Modal */}
      {activeSnippetProject && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
          <div className="w-full max-w-2xl bg-[var(--bg-surface-0)] border border-[var(--border-subtle)] rounded-2xl shadow-2xl overflow-hidden flex flex-col">
            <div className="flex items-center justify-between px-5 py-3 border-b border-[var(--border-subtle)] bg-[var(--bg-surface-1)]">
              <div className="flex items-center gap-2">
                <Code className="w-4 h-4 text-cyan-400" />
                <h4 className="text-xs font-bold text-[var(--text-primary)] font-mono">
                  {activeSnippetProject.title} • {activeSnippetProject.language || 'typescript'}
                </h4>
              </div>
              <button
                onClick={() => setActiveSnippetProject(null)}
                className="p-1 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface-2)]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <pre className="p-4 bg-[#0D1117] text-zinc-200 text-xs font-mono overflow-x-auto max-h-[60vh] leading-relaxed selection:bg-cyan-500/30">
              <code>{activeSnippetProject.codeSnippet}</code>
            </pre>
          </div>
        </div>
      )}

      {/* Publish Project Form Modal */}
      {isPublishingOpen && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
          <div className="w-full max-w-lg bg-[var(--bg-surface-0)] border border-[var(--border-subtle)] rounded-2xl shadow-2xl overflow-hidden flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--border-subtle)] bg-[var(--bg-surface-1)]">
              <div className="flex items-center gap-2">
                <FolderGit2 className="w-4 h-4 text-cyan-400" />
                <h4 className="text-sm font-bold text-[var(--text-primary)] font-display">
                  Publish Developer Project
                </h4>
              </div>
              <button
                onClick={() => setIsPublishingOpen(false)}
                className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface-2)] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateProject} className="p-6 space-y-3.5">
              {formError && (
                <div className="p-2.5 rounded-lg bg-red-500/10 border border-red-500/30 text-xs text-red-300 font-medium">
                  {formError}
                </div>
              )}

              <div>
                <label className="text-xs font-bold text-[var(--text-primary)] block mb-1">
                  Project Title *
                </label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Next.js Realtime Audio Canvas"
                  className="w-full px-3 py-2 rounded-xl bg-[var(--bg-surface-1)] border border-[var(--border-subtle)] text-xs text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-[var(--text-primary)] block mb-1">
                  Description *
                </label>
                <textarea
                  required
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Explain what the project does, key architecture patterns, and how other devs can test it..."
                  className="w-full px-3 py-2 rounded-xl bg-[var(--bg-surface-1)] border border-[var(--border-subtle)] text-xs text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-[var(--text-primary)] block mb-1">
                    Live Demo URL
                  </label>
                  <input
                    type="url"
                    value={demoUrl}
                    onChange={(e) => setDemoUrl(e.target.value)}
                    placeholder="https://..."
                    className="w-full px-3 py-2 rounded-xl bg-[var(--bg-surface-1)] border border-[var(--border-subtle)] text-xs text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-cyan-500"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-[var(--text-primary)] block mb-1">
                    GitHub Repo URL
                  </label>
                  <input
                    type="url"
                    value={githubUrl}
                    onChange={(e) => setGithubUrl(e.target.value)}
                    placeholder="https://github.com/..."
                    className="w-full px-3 py-2 rounded-xl bg-[var(--bg-surface-1)] border border-[var(--border-subtle)] text-xs text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-cyan-500"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-[var(--text-primary)] block mb-1">
                  Tags (comma separated)
                </label>
                <input
                  type="text"
                  value={tagsInput}
                  onChange={(e) => setTagsInput(e.target.value)}
                  placeholder="react, typescript, webrtc, postgres"
                  className="w-full px-3 py-2 rounded-xl bg-[var(--bg-surface-1)] border border-[var(--border-subtle)] text-xs text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-[var(--text-primary)] block mb-1">
                  Code Snippet / Architecture Sample
                </label>
                <textarea
                  rows={4}
                  value={codeSnippet}
                  onChange={(e) => setCodeSnippet(e.target.value)}
                  placeholder="// Paste an interesting excerpt, interface, or hook..."
                  className="w-full px-3 py-2 rounded-xl bg-[var(--bg-surface-1)] border border-[var(--border-subtle)] font-mono text-xs text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsPublishingOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface-2)] transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 rounded-xl bg-[var(--brand-primary,#dc2626)] hover:brightness-105 active:scale-[0.98] text-white font-semibold text-xs shadow-xs transition-all cursor-pointer disabled:opacity-50"
                >
                  {isSubmitting ? 'Publishing...' : 'Publish Project'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
