import { ReaderView } from "@/components/reader/ReaderView";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function ReadPage({ params }: PageProps) {
  const { id } = await params;
  return <ReaderView bookId={id} />;
}
