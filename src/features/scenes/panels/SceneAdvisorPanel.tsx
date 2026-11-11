import React from 'react';
import { SceneAdvisor } from '../SceneAdvisor';
import type { ProductDescription, ProductType } from '../../../shared/lib/visionProvider';

interface SceneAdvisorPanelProps {
  imageUrl: string | null;
  selectedType: ProductType;
  initialDescription?: string;
  isArabic: boolean;
  onTypeChange?: (type: ProductType) => void;
  onDescriptionChange?: (description: ProductDescription) => void;
  onChoose?: (scene: { id: string; title: string; imageUrl: string; prompt: string; type: ProductType }) => void;
}

export const SceneAdvisorPanel: React.FC<SceneAdvisorPanelProps> = ({
  imageUrl,
  selectedType,
  initialDescription,
  isArabic,
  onTypeChange,
  onDescriptionChange,
  onChoose,
}) => (
  onTypeChange && onDescriptionChange && onChoose ? (
    <SceneAdvisor
      imageUrl={imageUrl}
      imageBlob={null}
      selectedType={selectedType}
      onTypeChange={onTypeChange}
      onDescriptionChange={onDescriptionChange}
      onChoose={onChoose}
      initialDescription={initialDescription}
      isArabic={isArabic}
    />
  ) : (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 text-center text-sm text-slate-600 dark:border-slate-800 dark:bg-[#0B1528] dark:text-slate-300">
      {isArabic ? 'ارفع صورة منتج لاستخدام مستشار المشاهد.' : 'Upload a product image to use the scene advisor.'}
    </div>
  )
);
