export function FolderIcon({ color }: { color: string }) {
  return (
    <svg className="size-[16px] shrink-0 mr-[8px]" viewBox="0 0 16 16" fill="none">
      <path d="M1.60066 5.61132L1.60061 11.2942C1.60059 12.3988 2.49602 13.2942 3.6006 13.2942L12.3998 13.2942C13.5043 13.2942 14.3997 12.3988 14.3998 11.2943L14.3999 5.67518C14.4 5.12288 13.9522 4.67515 13.3999 4.67515H8.05577L6.21242 2.70605H2.60035C2.04792 2.70605 1.60014 3.15358 1.60031 3.70601C1.60048 4.30934 1.60067 5.06447 1.60066 5.61132Z" stroke={color} strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

