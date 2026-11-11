import React from 'react';

export type ScenePanelId = 'background' | 'shadow' | 'size' | 'product' | 'smart';

interface ScenePanelProps {
  id: ScenePanelId;
  activePanel: ScenePanelId;
  children: React.ReactNode;
}

export const ScenePanel: React.FC<ScenePanelProps> = ({ id, activePanel, children }) => (
  <section className={`${activePanel === id ? 'block' : 'hidden'} min-w-0 space-y-3 lg:block`}>
    {children}
  </section>
);
