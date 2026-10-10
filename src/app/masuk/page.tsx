import { redirect } from "next/navigation";

export default function Masuk() {
  redirect("/admin/login?sebagai=orang_tua");
}
