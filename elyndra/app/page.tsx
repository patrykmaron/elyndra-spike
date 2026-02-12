"use client";

import { useRole } from "@/lib/role-context";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function HomePage() {
  const { currentUser } = useRole();
  const router = useRouter();

  useEffect(() => {
    if (currentUser?.role === "COORDINATOR") {
      router.replace("/coordinator");
    } else if (currentUser?.role === "HOME_MANAGER") {
      router.replace("/home");
    }
  }, [currentUser, router]);

  return null;
}
