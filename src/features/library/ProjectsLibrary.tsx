import React, { useEffect, useRef, useState } from 'react';
import { Archive, Copy, Download, FolderOpen, Pencil, Plus, Search, Trash2, Upload } from 'lucide-react';
import {
  deleteProject,
  duplicateProject,
  exportProject,
  friendlyStorageError,
  importProject,
  listProjects,
  renameProject,
  type ProjectListItem
} from '../../store/projectDatabase';

interface ProjectsLibraryProps {
  isArabic: boolean;
  onOpenProject: (id: string, lastStage: ProjectListItem['lastStage']) => void;
  onCreateProject: () => void;
  onDeleteProject: (id: string) => void;
}

export const ProjectsLibrary: React.FC<ProjectsLibraryProps> = ({ isArabic, onOpenProject, onCreateProject, onDeleteProject }) => {
  const [projects, setProjects] = useState<ProjectListItem[]>([]);
  const [search, setSearch] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const importRef = useRef<HTMLInputElement>(null);
  const projectsRef = useRef<ProjectListItem[]>([]);

  const refresh = async () => {
    const next = await listProjects();
    projectsRef.current.forEach((project) => {
      if (project.thumbnail) URL.revokeObjectURL(project.thumbnail);
    });
    projectsRef.current = next;
    setProjects(next);
  };

  useEffect(() => {
    void refresh().catch((error: unknown) => setMessage(friendlyStorageError(error)));
    return () => projectsRef.current.forEach((project) => {
      if (project.thumbnail) URL.revokeObjectURL(project.thumbnail);
    });
  }, []);

  const filteredProjects = projects.filter((project) =>
    project.name.toLocaleLowerCase().includes(search.trim().toLocaleLowerCase())
  );

  const handleRename = async (project: ProjectListItem) => {
    const name = window.prompt(isArabic ? 'اسم المشروع الجديد' : 'New project name', project.name);
    if (!name?.trim()) return;
    try {
      await renameProject(project.id, name);
      await refresh();
    } catch (error) {
      setMessage(friendlyStorageError(error));
    }
  };

  const handleDelete = async (project: ProjectListItem) => {
    if (!window.confirm(isArabic ? `هل تريد حذف «${project.name}» نهائياً؟` : `Permanently delete "${project.name}"?`)) return;
    try {
      await deleteProject(project.id);
      await refresh();
      onDeleteProject(project.id);
    } catch (error) {
      setMessage(friendlyStorageError(error));
    }
  };

  const handleDuplicate = async (project: ProjectListItem) => {
    try {
      await duplicateProject(project.id);
      await refresh();
    } catch (error) {
      setMessage(friendlyStorageError(error));
    }
  };

  const handleExport = async (project: ProjectListItem) => {
    try {
      const blob = await exportProject(project.id);
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = `${project.name.replace(/[\\/:*?"<>|]/g, '_')}.zip`;
      anchor.style.display = 'none';
      document.body.appendChild(anchor);
      anchor.click();
      window.setTimeout(() => {
        anchor.remove();
        URL.revokeObjectURL(url);
      }, 1000);
    } catch (error) {
      setMessage(friendlyStorageError(error));
    }
  };

  const handleImport = async (file?: File) => {
    if (!file) return;
    try {
      const imported = await importProject(file);
      await refresh();
      onOpenProject(imported.id, imported.lastStage);
    } catch (error) {
      setMessage(friendlyStorageError(error));
    } finally {
      if (importRef.current) importRef.current.value = '';
    }
  };

  const handleOpen = (project: ProjectListItem) => {
    onOpenProject(project.id, project.lastStage);
  };

  return (
    <section className="flex h-full min-h-0 flex-col gap-3 overflow-y-auto">
      <input
        ref={importRef}
        type="file"
        accept=".zip,application/zip"
        className="hidden"
        onChange={(event) => void handleImport(event.target.files?.[0])}
      />
      <header className="flex shrink-0 flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-[#0B1528]">
        <div>
          <h1 className="text-sm font-bold text-slate-900 dark:text-white">{isArabic ? 'أعمالي' : 'My Projects'}</h1>
          <p className="text-[11px] text-slate-500">{isArabic ? `${projects.length} مشروع محفوظ على هذا الجهاز` : `${projects.length} projects saved on this device`}</p>
        </div>
        <div className="flex items-center gap-2">
          <button type="button" onClick={() => importRef.current?.click()} className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-2.5 py-2 text-xs font-semibold dark:border-slate-700">
            <Upload className="h-4 w-4" /> {isArabic ? 'استيراد ZIP' : 'Import ZIP'}
          </button>
          <button type="button" onClick={onCreateProject} className="flex items-center gap-1.5 rounded-lg bg-[#D48B16] px-2.5 py-2 text-xs font-bold text-slate-950">
            <Plus className="h-4 w-4" /> {isArabic ? 'مشروع جديد' : 'New project'}
          </button>
        </div>
      </header>

      <label className="flex shrink-0 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 dark:border-slate-800 dark:bg-[#0B1528]">
        <Search className="h-4 w-4 text-slate-400" />
        <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder={isArabic ? 'ابحث عن مشروع...' : 'Search projects...'} className="w-full bg-transparent py-2.5 text-xs outline-none" />
      </label>

      {message && <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700 dark:bg-red-950/30 dark:text-red-300">{message}</p>}

      {filteredProjects.length ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filteredProjects.map((project) => (
            <article key={project.id} className="overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-[#0B1528]">
              <button type="button" onClick={() => void handleOpen(project)} className="block w-full text-start">
                <div className="flex aspect-[4/3] items-center justify-center bg-slate-100 p-2 dark:bg-slate-900">
                  {project.thumbnail ? <img src={project.thumbnail} alt="" className="h-full w-full object-contain" /> : <Archive className="h-8 w-8 text-slate-400" />}
                </div>
                <div className="p-3">
                  <h2 className="truncate text-sm font-bold text-slate-900 dark:text-white">{project.name}</h2>
                  <p className="mt-1 text-[10px] text-slate-500">{new Date(project.updatedAt).toLocaleString(isArabic ? 'ar' : 'en')}</p>
                  <p className="mt-1 text-[10px] text-[#D48B16]">{isArabic ? 'آخر مرحلة: ' : 'Last stage: '}{project.lastStage}</p>
                </div>
              </button>
              <div className="flex items-center gap-1 border-t border-slate-100 p-2 dark:border-slate-800">
                <button type="button" onClick={() => void handleOpen(project)} title={isArabic ? 'فتح المشروع' : 'Open project'} className="rounded-lg p-2 text-[#D48B16] hover:bg-slate-100 dark:hover:bg-slate-800"><FolderOpen className="h-4 w-4" /></button>
                <button type="button" onClick={() => void handleRename(project)} title={isArabic ? 'إعادة تسمية' : 'Rename'} className="rounded-lg p-2 hover:bg-slate-100 dark:hover:bg-slate-800"><Pencil className="h-4 w-4" /></button>
                <button type="button" onClick={() => void handleDuplicate(project)} title={isArabic ? 'إنشاء نسخة' : 'Duplicate'} className="rounded-lg p-2 hover:bg-slate-100 dark:hover:bg-slate-800"><Copy className="h-4 w-4" /></button>
                <button type="button" onClick={() => void handleExport(project)} title={isArabic ? 'تصدير ZIP' : 'Export ZIP'} className="rounded-lg p-2 hover:bg-slate-100 dark:hover:bg-slate-800"><Download className="h-4 w-4" /></button>
                <button type="button" onClick={() => void handleDelete(project)} title={isArabic ? 'حذف المشروع' : 'Delete project'} className="ms-auto rounded-lg p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30"><Trash2 className="h-4 w-4" /></button>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="flex min-h-48 flex-1 items-center justify-center rounded-xl border border-dashed border-slate-300 text-center text-xs text-slate-500 dark:border-slate-700">
          {search ? (isArabic ? 'لا توجد مشاريع تطابق البحث.' : 'No matching projects.') : (isArabic ? 'لا توجد أعمال محفوظة بعد. ارفع صورة لبدء مشروعك.' : 'No saved projects yet. Upload a photo to start.')}
        </div>
      )}
    </section>
  );
};
