import type { Letter } from "@/lib/types";

const LETTERHEAD: Record<Letter["letterheadStyle"], string> = {
  bda: "Bureau of Disability Adjudication",
  bda_appeals: "Bureau of Disability Adjudication  ·  Office of Hearings",
  medical: "Bureau of Disability Adjudication  ·  Medical Scheduling",
  generic: "Bureau of Disability Adjudication",
};

export default function LetterDocument({ letter }: { letter: Letter }) {
  const [heading, ...rest] = letter.bodyText.split("\n");
  return (
    <div className="relative bg-white text-[#1a1a1a] border border-line-strong rounded-sm shadow-[0_1px_0_rgba(0,0,0,0.02),0_8px_24px_-16px_rgba(0,0,0,0.25)] overflow-hidden">
      <div className="absolute inset-x-0 top-0 h-1 bg-[repeating-linear-gradient(90deg,transparent,transparent_6px,#00000008_6px,#00000008_12px)]" />
      <div className="px-7 pt-6 pb-2 border-b border-dashed border-[#d8d8d8]">
        <div className="font-mono text-[10px] tracking-wide text-[#8a8a8a] uppercase">
          {LETTERHEAD[letter.letterheadStyle]}
        </div>
        <div className="mt-1 font-serif text-[15px] font-semibold text-[#222] leading-snug">
          {heading}
        </div>
      </div>
      <div className="px-7 py-5 font-serif text-[12.5px] leading-[1.7] text-[#2a2a2a] whitespace-pre-line">
        {rest.join("\n").trim()}
      </div>
      <div className="px-7 pb-4 pt-1">
        <div className="font-mono text-[9.5px] text-[#b0b0b0] uppercase tracking-wider">
          Fictional document · synthetic demo data · not a real agency
        </div>
      </div>
    </div>
  );
}
