"use client";

import { useRole, type CurrentUser } from "@/lib/role-context";
import { useEffect } from "react";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { User, Building2 } from "lucide-react";

interface RoleSwitcherProps {
  allUsers: CurrentUser[];
}

export function RoleSwitcher({ allUsers }: RoleSwitcherProps) {
  const { currentUser, setCurrentUser, setUsers } = useRole();

  useEffect(() => {
    setUsers(allUsers);
    // Auto-select first coordinator if no user selected
    if (!currentUser && allUsers.length > 0) {
      const coordinator = allUsers.find((u) => u.role === "COORDINATOR");
      if (coordinator) setCurrentUser(coordinator);
    }
  }, [allUsers]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <Select
      value={currentUser?.id ?? ""}
      onValueChange={(id) => {
        const user = allUsers.find((u) => u.id === id);
        if (user) setCurrentUser(user);
      }}
    >
      <SelectTrigger className="w-[220px] bg-background">
        <div className="flex items-center gap-2">
          {currentUser?.role === "COORDINATOR" ? (
            <User className="h-4 w-4 text-blue-600" />
          ) : (
            <Building2 className="h-4 w-4 text-green-600" />
          )}
          <SelectValue placeholder="Select user..." />
        </div>
      </SelectTrigger>
      <SelectContent>
        <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">
          Coordinators
        </div>
        {allUsers
          .filter((u) => u.role === "COORDINATOR")
          .map((u) => (
            <SelectItem key={u.id} value={u.id}>
              <div className="flex items-center gap-2">
                <User className="h-3.5 w-3.5 text-blue-600" />
                {u.name}
              </div>
            </SelectItem>
          ))}
        <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground mt-1">
          Home Managers
        </div>
        {allUsers
          .filter((u) => u.role === "HOME_MANAGER")
          .map((u) => (
            <SelectItem key={u.id} value={u.id}>
              <div className="flex items-center gap-2">
                <Building2 className="h-3.5 w-3.5 text-green-600" />
                <span>
                  {u.name}
                  {u.homeName && (
                    <span className="text-muted-foreground ml-1 text-xs">
                      — {u.homeName}
                    </span>
                  )}
                </span>
              </div>
            </SelectItem>
          ))}
      </SelectContent>
    </Select>
  );
}
