export function CouponsTable({ onEdit }: { onEdit?: (coupon: any) => void }) {
  return (
    <div className="rounded-md border">
      <table className="w-full">
        <thead>
          <tr className="border-b bg-muted/50">
            <th className="p-3 text-left text-sm font-medium">Code</th>
            <th className="p-3 text-left text-sm font-medium">Discount</th>
            <th className="p-3 text-left text-sm font-medium">Status</th>
            <th className="p-3 text-right text-sm font-medium">Actions</th>
          </tr>
        </thead>
        <tbody>
          <tr className="border-b">
            <td colSpan={4} className="p-8 text-center text-muted-foreground">
              No coupons yet
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}
