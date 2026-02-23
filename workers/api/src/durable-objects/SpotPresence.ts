export class SpotPresence implements DurableObject {
  private viewers: Set<string> = new Set();

  constructor(
    private readonly state: DurableObjectState,
    private readonly env: unknown
  ) {}

  async fetch(request: Request): Promise<Response> {
    try {
      const { userId, action } = (await request.json()) as {
        userId: string;
        action: "join" | "leave";
      };

      if (action === "join") this.viewers.add(userId);
      if (action === "leave") this.viewers.delete(userId);

      return Response.json({
        count: this.viewers.size,
        viewers: Array.from(this.viewers),
      });
    } catch {
      return Response.json({ error: "Invalid request" }, { status: 400 });
    }
  }
}
