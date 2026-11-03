"use client";

import { useState } from "react";
import { ShieldCheck, UserPlus, UserX } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Field, Input, Select } from "@/components/ui/Field";
import { ConfirmButton, useAction } from "@/components/ui/client";
import { Table, Td, Th, Tr } from "@/components/ui/Table";
import { setUserRole } from "@/lib/actions/staff";
import { formatDate } from "@/lib/format";

export type StaffRow = { id: string; name: string; email: string; role: "admin" | "moderator"; createdAt: string };

export function StaffManager({ staff, meId }: { staff: StaffRow[]; meId: string }) {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"admin" | "moderator">("moderator");
  const { pending, run } = useAction();

  return (
    <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
      <Card>
        <CardHeader description={`${staff.length} people can sign in to this panel`} title="Team" />
        <Table>
          <thead>
            <tr>
              <Th>Name</Th>
              <Th>Role</Th>
              <Th>Joined</Th>
              <Th className="w-0" />
            </tr>
          </thead>
          <tbody>
            {staff.map((member) => (
              <Tr key={member.id}>
                <Td>
                  <span className="block font-semibold">
                    {member.name} {member.id === meId && <span className="text-xs font-normal text-muted">(you)</span>}
                  </span>
                  <span className="text-xs text-muted">{member.email}</span>
                </Td>
                <Td>
                  {member.id === meId ? (
                    <Badge tone={member.role === "admin" ? "brand" : "neutral"}>{member.role}</Badge>
                  ) : (
                    <select
                      aria-label={`Role for ${member.name}`}
                      className="h-8 rounded-md border border-line-strong bg-surface px-2 text-sm"
                      disabled={pending}
                      onChange={(event) => run(() => setUserRole(member.email, event.target.value as "admin" | "moderator"))}
                      value={member.role}
                    >
                      <option value="admin">Admin</option>
                      <option value="moderator">Moderator</option>
                    </select>
                  )}
                </Td>
                <Td className="text-muted">{formatDate(member.createdAt)}</Td>
                <Td>
                  {member.id !== meId && (
                    <ConfirmButton
                      action={() => setUserRole(member.email, "customer")}
                      aria-label={`Remove ${member.name}`}
                      confirmLabel="Remove access"
                      description="Their storefront account stays; they just can't open the admin panel."
                      size="icon"
                      title={`Remove ${member.name} from the team?`}
                    >
                      <UserX />
                    </ConfirmButton>
                  )}
                </Td>
              </Tr>
            ))}
          </tbody>
        </Table>
      </Card>

      <div className="grid gap-6">
        <Card>
          <CardHeader description="They need a storefront account first." title="Add a team member" />
          <CardBody>
            <form
              className="grid gap-4"
              onSubmit={(event) => {
                event.preventDefault();
                run(() => setUserRole(email, role), { onSuccess: () => setEmail("") });
              }}
            >
              <Field htmlFor="staff-email" label="Email">
                <Input id="staff-email" onChange={(event) => setEmail(event.target.value)} required type="email" value={email} />
              </Field>
              <Field htmlFor="staff-role" label="Role">
                <Select id="staff-role" onChange={(event) => setRole(event.target.value as "admin" | "moderator")} value={role}>
                  <option value="moderator">Moderator</option>
                  <option value="admin">Admin</option>
                </Select>
              </Field>
              <Button loading={pending} type="submit">
                <UserPlus /> Give access
              </Button>
            </form>
          </CardBody>
        </Card>
        <Card className="p-5 text-sm">
          <p className="flex items-center gap-2 font-bold text-brand-ink">
            <ShieldCheck className="size-4 text-brand-primary" /> What each role can do
          </p>
          <dl className="mt-3 grid gap-2.5 text-xs leading-5">
            <div>
              <dt className="font-semibold text-brand-ink">Moderator</dt>
              <dd className="text-muted">Orders, products, variations, categories, collections, stock, customers, reviews and media.</dd>
            </div>
            <div>
              <dt className="font-semibold text-brand-ink">Admin</dt>
              <dd className="text-muted">Everything, plus coupons, store content, settings, the team, and deleting things.</dd>
            </div>
          </dl>
        </Card>
      </div>
    </div>
  );
}
