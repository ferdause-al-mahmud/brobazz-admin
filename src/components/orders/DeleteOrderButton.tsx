"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Checkbox } from "@/components/ui/Field";
import { Modal, useAction } from "@/components/ui/client";
import { deleteOrder } from "@/lib/actions/orders";

/** Admin-only. Offers to put the items back in stock unless that already happened or they were delivered. */
export function DeleteOrderButton({ orderID, canRestock }: { orderID: number; canRestock: boolean }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [restock, setRestock] = useState(canRestock);
  const { pending, run } = useAction();

  return (
    <>
      <Button onClick={() => setOpen(true)} variant="danger-ghost">
        <Trash2 /> Delete
      </Button>
      <Modal
        description="The order disappears from the admin, reports and the customer's account. This can't be undone."
        footer={
          <>
            <Button onClick={() => setOpen(false)} variant="secondary">
              Keep order
            </Button>
            <Button
              loading={pending}
              onClick={() => run(() => deleteOrder(orderID, restock), { refresh: false, onSuccess: () => router.replace("/orders") })}
              variant="danger"
            >
              Delete order #{orderID}
            </Button>
          </>
        }
        onClose={() => setOpen(false)}
        open={open}
        size="sm"
        title={`Delete order #${orderID}?`}
      >
        {canRestock ? (
          <Checkbox checked={restock} label="Put its items back in stock" onChange={(event) => setRestock(event.target.checked)} />
        ) : (
          <p className="text-sm text-muted">Its items were already returned to stock or delivered, so stock won&apos;t change.</p>
        )}
      </Modal>
    </>
  );
}
