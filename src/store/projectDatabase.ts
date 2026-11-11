import Dexie, { type Table } from 'dexie';
import JSZip from 'jszip';
import type { ProcessedImage, RembgSettings } from '../types';

export type ProjectStage = 'removal' | 'supir' | 'generator' | 'storyboard' | 'ads';

export interface Project {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  productType: string;
  original: Blob;
  isolated: Blob | null;
  enhanced: Blob | null;
  enhanceSettings: Record<string, number>;
  scenes: Record<string, unknown>[];
  boardFrames: Record<string, unknown>[];
  dimensions: Record<string, number | string>;
  adCopy: string;
  adFrames: Record<string, unknown>[];
  productDescription: string;
  materials: string[];
  studioSettings: RembgSettings;
  lastStage: ProjectStage;
  image: Omit<ProcessedImage, 'originalUrl' | 'processedUrl' | 'maskUrl' | 'history' | 'generatedBackgroundUrl'>;
}

export interface ProjectThumbnail {
  projectId: string;
  blob: Blob;
}

interface ProjectAsset {
  projectId: string;
  frameId: string;
  blob: Blob;
}

export interface ProjectListItem extends Omit<Project, 'original' | 'isolated' | 'enhanced'> {
  thumbnail: string | null;
}

class StudioDatabase extends Dexie {
  projects!: Table<Project, string>;
  thumbnails!: Table<ProjectThumbnail, string>;
  assets!: Table<ProjectAsset, [string, string]>;

  constructor() {
    super('alshams-studio-projects');
    this.version(1).stores({
      projects: 'id, name, createdAt, updatedAt, lastStage',
      thumbnails: 'projectId'
    });
    this.version(2).stores({
      projects: 'id, name, createdAt, updatedAt, lastStage',
      thumbnails: 'projectId',
      assets: '[projectId+frameId], projectId'
    });
    this.version(3).stores({
      projects: 'id, name, createdAt, updatedAt, lastStage',
      thumbnails: 'projectId',
      assets: '[projectId+frameId], projectId'
    }).upgrade((transaction) => transaction.table('projects').toCollection().modify((project: Project) => {
      project.adFrames ||= [];
      project.productDescription ||= '';
      project.materials ||= [];
    }));
  }
}

const database = new StudioDatabase();

export function isQuotaError(error: unknown): boolean {
  return Boolean(error && typeof error === 'object' && (
    (error instanceof DOMException || error instanceof Error)
      && (error.name === 'QuotaExceededError' || error.name === 'NS_ERROR_DOM_QUOTA_REACHED')
    || 'inner' in error && isQuotaError(error.inner)
    || 'innerError' in error && isQuotaError(error.innerError)
  ));
}

export const friendlyStorageError = (error: unknown) => isQuotaError(error)
  ? 'مساحة التخزين في المتصفح ممتلئة. احذف بعض المشاريع أو صدّرها ثم أعد المحاولة.'
  : error instanceof Error ? error.message : 'تعذر حفظ المشروع في هذا المتصفح.';

export async function requestPersistentStorage() {
  if (!navigator.storage?.persist) return false;
  return navigator.storage.persist();
}

const urlToBlob = async (url: string | null | undefined): Promise<Blob | null> => {
  if (!url) return null;
  const response = await fetch(url);
  if (!response.ok) throw new Error('تعذر تجهيز الصورة للحفظ.');
  return response.blob();
};

const makeThumbnail = async (blob: Blob): Promise<Blob> => {
  const bitmap = await createImageBitmap(blob);
  try {
    const scale = Math.min(1, 320 / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(bitmap.width * scale));
    canvas.height = Math.max(1, Math.round(bitmap.height * scale));
    const context = canvas.getContext('2d');
    if (!context) throw new Error('تعذر إنشاء الصورة المصغرة.');
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    return await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob((thumbnail) => thumbnail ? resolve(thumbnail) : reject(new Error('تعذر حفظ الصورة المصغرة.')), 'image/jpeg', 0.78);
    });
  } finally {
    bitmap.close();
  }
};

const toProject = async (
  item: ProcessedImage,
  previous: Project | undefined,
  stage: ProjectStage | undefined,
  projectData: Partial<Pick<Project, 'productType' | 'enhanceSettings' | 'scenes' | 'boardFrames' | 'dimensions' | 'adCopy' | 'adFrames' | 'productDescription' | 'materials' | 'studioSettings'>> = {}
): Promise<Project> => {
  const original = await urlToBlob(item.originalUrl);
  if (!original) throw new Error('الصورة الأصلية غير متاحة للحفظ.');
  const isolated = await urlToBlob(item.processedUrl);
  const image = {
    id: item.id,
    name: item.name,
    status: item.status,
    originalWidth: item.originalWidth,
    originalHeight: item.originalHeight,
    outputWidth: item.outputWidth,
    outputHeight: item.outputHeight,
    originalSize: item.originalSize,
    outputSize: item.outputSize,
    processingTimeMs: item.processingTimeMs,
    error: item.error,
    modelUsed: item.modelUsed,
    timestamp: item.timestamp,
    customPath: item.customPath,
    outputPath: item.outputPath
  };
  return {
    id: item.id,
    name: previous?.name || item.name.replace(/\.[^/.]+$/, ''),
    createdAt: previous?.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    productType: projectData.productType || previous?.productType || 'other',
    original,
    isolated,
    enhanceSettings: projectData.enhanceSettings || previous?.enhanceSettings || {},
    enhanced: previous?.enhanced || null,
    scenes: projectData.scenes || previous?.scenes || [],
    boardFrames: projectData.boardFrames || previous?.boardFrames || [],
    dimensions: projectData.dimensions || previous?.dimensions || {},
    adCopy: projectData.adCopy ?? previous?.adCopy ?? '',
    adFrames: projectData.adFrames || previous?.adFrames || [],
    productDescription: projectData.productDescription ?? previous?.productDescription ?? '',
    materials: projectData.materials || previous?.materials || [],
    studioSettings: projectData.studioSettings || previous?.studioSettings || {
      model: 'u2net',
      alphaMatting: true,
      af: 240,
      ab: 10,
      ae: 10,
      edgeFeathering: 2,
      outputFormat: 'png',
      backgroundType: 'transparent',
      backgroundColor: '#FFFFFF',
      autoSave: false,
      engineMode: 'server',
      soundAlerts: true,
      browserNotifications: false
    },
    lastStage: stage || previous?.lastStage || 'removal',
    image
  };
};

export async function saveImageProject(
  item: ProcessedImage,
  stage?: ProjectStage,
  data: Partial<Pick<Project, 'productType' | 'enhanceSettings' | 'scenes' | 'boardFrames' | 'dimensions' | 'adCopy' | 'adFrames' | 'productDescription' | 'materials' | 'studioSettings'>>
    & { enhancedUrl?: string | null } = {}
) {
  const previous = await database.projects.get(item.id);
  const project = await toProject(item, previous, stage, data);
  if (data.enhancedUrl !== undefined) {
    project.enhanced = await urlToBlob(data.enhancedUrl);
  } else {
    project.enhanced = previous?.enhanced || null;
  }
  const boardAssets: ProjectAsset[] = [];
  project.scenes = await Promise.all(project.scenes.map(async (scene) => {
    const sceneId = String(scene.id || '');
    const imageUrl = scene.imageUrl;
    if (sceneId && typeof imageUrl === 'string') {
      const blob = await urlToBlob(imageUrl);
      if (blob) boardAssets.push({ projectId: project.id, frameId: `scene:${sceneId}`, blob });
      return { ...scene, imageUrl: null, imageAsset: Boolean(blob) };
    }
    return scene;
  }));
  if (data.boardFrames) {
    project.boardFrames = await Promise.all(data.boardFrames.map(async (frame) => {
      const frameId = String(frame.id || '');
      const imageUrl = frame.imageUrl;
      if (frame.sceneId) {
        return { ...frame, imageUrl: null, imageAsset: false };
      }
      if (frameId && typeof imageUrl === 'string') {
        const blob = await urlToBlob(imageUrl);
        if (blob) boardAssets.push({ projectId: project.id, frameId, blob });
        return { ...frame, imageUrl: null, imageAsset: Boolean(blob) };
      }
      return { ...frame, imageUrl: null, imageAsset: false };
    }));
  }
  const thumbnailSource = project.isolated || project.original;
  const thumbnail = await makeThumbnail(thumbnailSource);
  await database.transaction('rw', database.projects, database.thumbnails, database.assets, async () => {
    await database.projects.put(project);
    await database.thumbnails.put({ projectId: project.id, blob: thumbnail });
    if (data.boardFrames || data.scenes) {
      await database.assets.where('projectId').equals(project.id).delete();
      await database.assets.bulkPut(boardAssets);
    }
  });
  return project;
}

export async function listProjects(): Promise<ProjectListItem[]> {
  const projects = await database.projects.orderBy('updatedAt').reverse().toArray();
  return Promise.all(projects.map(async ({ original: _original, isolated: _isolated, enhanced: _enhanced, ...project }) => {
    const thumbnail = await database.thumbnails.get(project.id);
    return {
      ...project,
      thumbnail: thumbnail ? URL.createObjectURL(thumbnail.blob) : null
    };
  }));
}

export async function loadProject(id: string): Promise<{
  project: Project;
  image: ProcessedImage;
  enhancedUrl: string | null;
  scenes: Record<string, unknown>[];
  boardFrames: Record<string, unknown>[];
} | null> {
  const project = await database.projects.get(id);
  if (!project) return null;
  const image: ProcessedImage = {
    ...project.image,
    id: project.id,
    originalUrl: URL.createObjectURL(project.original),
    processedUrl: project.isolated ? URL.createObjectURL(project.isolated) : null,
    history: []
  };
  const savedAssets = await database.assets.where('projectId').equals(id).toArray();
  const assetUrls = new Map(savedAssets.map((asset) => [asset.frameId, URL.createObjectURL(asset.blob)]));
  const scenes = project.scenes.map((scene) => {
    const sceneId = String(scene.id || '');
    return {
      ...scene,
      imageUrl: scene.imageAsset ? assetUrls.get(`scene:${sceneId}`) || null : (typeof scene.imageUrl === 'string' ? scene.imageUrl : null)
    };
  });
  const sceneUrls = new Map(project.scenes.map((scene) => [
    String(scene.id || ''),
    scene.imageAsset
      ? assetUrls.get(`scene:${String(scene.id || '')}`) || null
      : (typeof scene.imageUrl === 'string' ? scene.imageUrl : null)
  ]));
  const boardFrames = project.boardFrames.map((frame) => {
    const frameId = String(frame.id || '');
    return {
      ...frame,
      imageUrl: (typeof frame.sceneId === 'string'
        ? sceneUrls.get(frame.sceneId)
        : assetUrls.get(frameId) || assetUrls.get(`frame:${frameId}`))
        || (typeof frame.imageUrl === 'string' ? frame.imageUrl : null)
    };
  });
  return {
    project,
    image,
    enhancedUrl: project.enhanced ? URL.createObjectURL(project.enhanced) : null,
    scenes,
    boardFrames
  };
}

export async function renameProject(id: string, name: string) {
  await database.projects.update(id, { name: name.trim(), updatedAt: new Date().toISOString() });
}

export async function deleteProject(id: string) {
  await database.transaction('rw', database.projects, database.thumbnails, database.assets, async () => {
    await database.projects.delete(id);
    await database.thumbnails.delete(id);
    await database.assets.where('projectId').equals(id).delete();
  });
}

export async function duplicateProject(id: string) {
  const project = await database.projects.get(id);
  if (!project) throw new Error('المشروع غير موجود.');
  const copyId = `project-${crypto.randomUUID()}`;
  const copy: Project = {
    ...project,
    id: copyId,
    name: `${project.name} - نسخة`,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    image: { ...project.image, id: copyId }
  };
  const thumbnail = await database.thumbnails.get(id);
  const assets = await database.assets.where('projectId').equals(id).toArray();
  await database.transaction('rw', database.projects, database.thumbnails, database.assets, async () => {
    await database.projects.put(copy);
    if (thumbnail) await database.thumbnails.put({ ...thumbnail, projectId: copy.id });
    await database.assets.bulkPut(assets.map((asset) => ({ ...asset, projectId: copy.id })));
  });
  return copy.id;
}

export async function exportProject(id: string) {
  const project = await database.projects.get(id);
  if (!project) throw new Error('المشروع غير موجود.');
  const zip = new JSZip();
  const { original, isolated, enhanced, ...metadata } = project;
  const assets = await database.assets.where('projectId').equals(id).toArray();
  const zipAssets: { frameId: string; path: string; type: string }[] = [];
  for (const asset of assets) {
    const path = `project-assets/${encodeURIComponent(asset.frameId)}`;
    zip.file(path, asset.blob);
    zipAssets.push({ frameId: asset.frameId, path, type: asset.blob.type });
  }
  zip.file('project.json', JSON.stringify({
    ...metadata,
    zipAssets,
    blobs: {
      original: { type: original.type, name: 'original' },
      isolated: isolated ? { type: isolated.type, name: 'isolated' } : null,
      enhanced: enhanced ? { type: enhanced.type, name: 'enhanced' } : null
    }
  }));
  zip.file('original', original);
  if (isolated) zip.file('isolated', isolated);
  if (enhanced) zip.file('enhanced', enhanced);
  return zip.generateAsync({ type: 'blob', compression: 'DEFLATE' });
}

export async function importProject(file: File) {
  const zip = await JSZip.loadAsync(file);
  const metadataFile = zip.file('project.json');
  if (!metadataFile) throw new Error('ملف المشروع لا يحتوي على بيانات صالحة.');
  const metadata = JSON.parse(await metadataFile.async('string')) as Omit<Project, 'original' | 'isolated' | 'enhanced'> & {
    blobs?: { original?: { type: string }; isolated?: { type: string } | null; enhanced?: { type: string } | null };
    zipAssets?: { frameId: string; path: string; type: string }[];
  };
  if (
    !metadata.id
    || !metadata.image
    || !metadata.blobs?.original
    || typeof metadata.blobs.original.type !== 'string'
    || !Array.isArray(metadata.boardFrames)
    || !Array.isArray(metadata.scenes)
    || !['removal', 'supir', 'generator', 'storyboard', 'ads'].includes(metadata.lastStage)
    || !Array.isArray(metadata.zipAssets || [])
  ) {
    throw new Error('ملف المشروع غير مكتمل أو غير صالح.');
  }
  const originalFile = zip.file('original');
  if (!originalFile) throw new Error('الصورة الأصلية غير موجودة في ملف المشروع.');
  const original = await originalFile.async('blob');
  const isolatedFile = zip.file('isolated');
  const enhancedFile = zip.file('enhanced');
  const isolated = isolatedFile ? await isolatedFile.async('blob') : null;
  const enhanced = enhancedFile ? await enhancedFile.async('blob') : null;
  const project: Project = {
    ...metadata,
    id: `project-${crypto.randomUUID()}`,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    original: new Blob([original], { type: metadata.blobs.original.type }),
    isolated: isolated ? new Blob([isolated], { type: metadata.blobs.isolated?.type || isolated.type }) : null,
    enhanced: enhanced ? new Blob([enhanced], { type: metadata.blobs.enhanced?.type || enhanced.type }) : null
  };
  project.image = { ...project.image, id: project.id };
  const thumbnail = await makeThumbnail(project.isolated || project.original);
  const assets = await Promise.all((metadata.zipAssets || []).map(async (item) => {
    const assetFile = zip.file(item.path);
    if (!assetFile) throw new Error('إحدى صور اللوحة غير موجودة في ملف المشروع.');
    return { projectId: project.id, frameId: item.frameId, blob: new Blob([await assetFile.async('blob')], { type: item.type }) };
  }));
  await database.transaction('rw', database.projects, database.thumbnails, database.assets, async () => {
    await database.projects.put(project);
    await database.thumbnails.put({ projectId: project.id, blob: thumbnail });
    await database.assets.bulkPut(assets);
  });
  return { id: project.id, lastStage: project.lastStage };
}

export type EnhancementSnapshot = {
  scaleFactor: number;
  brightness: number;
  contrast: number;
  sharpness: number;
};

export type StudioSettingsSnapshot = RembgSettings;
