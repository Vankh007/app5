export function UserSubscriptionsTable() {
  return (
    <div className="rounded-md border">
      <table className="w-full">
        <thead>
          <tr className="border-b bg-muted/50">
            <th className="p-3 text-left text-sm font-medium">User</th>
            <th className="p-3 text-left text-sm font-medium">Plan</th>
            <th className="p-3 text-left text-sm font-medium">Status</th>
            <th className="p-3 text-left text-sm font-medium">Expires</th>
          </tr>
        </thead>
        <tbody>
          <tr className="border-b">
            <td colSpan={4} className="p-8 text-center text-muted-foreground">
              No subscriptions yet
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}
