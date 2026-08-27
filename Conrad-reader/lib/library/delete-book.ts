import { removeBookCompletely } from "@/lib/db/index";
import { cancelProgressSave } from "@/lib/reading/progress";
import { deleteBookFile } from "@/lib/storage/files";

export async function deleteBookFromLibrary(id: string): Promise<void> {
  cancelProgressSave(id);
  await deleteBookFile(id);
  await removeBookCompletely(id);
}
