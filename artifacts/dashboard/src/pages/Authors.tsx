import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Plus, UserCircle2, Twitter, Linkedin, Pencil, Users, PowerOff, Power } from "lucide-react";
import {
  useListAuthors,
  useCreateAuthor,
  useUpdateAuthor,
  getListAuthorsQueryKey,
} from "@workspace/api-client-react";
import type { AuthorProfile, CreateAuthorInput, UpdateAuthorInput } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";

const slugify = (name: string) =>
  name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

const authorFormSchema = z.object({
  name: z.string().min(1, "Name is required"),
  slug: z
    .string()
    .min(1, "Slug is required")
    .regex(/^[a-z0-9-]+$/, "Slug must be lowercase letters, numbers, and hyphens only"),
  bio: z.string().optional().default(""),
  avatarUrl: z.string().optional().default(""),
  twitterHandle: z.string().optional().default(""),
  linkedInUrl: z.string().optional().default(""),
  isStaff: z.boolean().default(false),
});

type AuthorFormValues = z.infer<typeof authorFormSchema>;

function AuthorAvatar({ author, size = "md" }: { author: AuthorProfile; size?: "sm" | "md" | "lg" }) {
  const sizes = { sm: "w-8 h-8 text-sm", md: "w-10 h-10 text-base", lg: "w-14 h-14 text-xl" };
  if (author.avatarUrl) {
    return (
      <img
        src={author.avatarUrl}
        alt={author.name}
        className={`${sizes[size]} rounded-full object-cover border border-border`}
      />
    );
  }
  return (
    <div
      className={`${sizes[size]} rounded-full bg-primary/10 text-primary flex items-center justify-center font-semibold shrink-0`}
    >
      {author.name.charAt(0).toUpperCase()}
    </div>
  );
}

function AuthorForm({
  initial,
  onSubmit,
  isLoading,
}: {
  initial?: Partial<AuthorFormValues>;
  onSubmit: (data: AuthorFormValues) => void;
  isLoading: boolean;
}) {
  const form = useForm<AuthorFormValues>({
    resolver: zodResolver(authorFormSchema),
    defaultValues: {
      name: initial?.name ?? "",
      slug: initial?.slug ?? "",
      bio: initial?.bio ?? "",
      avatarUrl: initial?.avatarUrl ?? "",
      twitterHandle: initial?.twitterHandle ?? "",
      linkedInUrl: initial?.linkedInUrl ?? "",
      isStaff: initial?.isStaff ?? false,
    },
  });

  const nameValue = form.watch("name");

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Name</FormLabel>
                <FormControl>
                  <Input
                    placeholder="Jane Smith"
                    {...field}
                    onChange={(e) => {
                      field.onChange(e);
                      if (!initial?.slug) {
                        form.setValue("slug", slugify(e.target.value), {
                          shouldValidate: true,
                        });
                      }
                    }}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="slug"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Slug</FormLabel>
                <FormControl>
                  <Input
                    placeholder="jane-smith"
                    {...field}
                    readOnly={!!initial?.slug}
                    className={initial?.slug ? "bg-muted" : ""}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="bio"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Bio <span className="text-muted-foreground font-normal">(optional)</span></FormLabel>
              <FormControl>
                <Textarea
                  placeholder="A brief description of this author…"
                  rows={3}
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="avatarUrl"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Avatar URL <span className="text-muted-foreground font-normal">(optional)</span></FormLabel>
              <FormControl>
                <Input placeholder="https://…" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="twitterHandle"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Twitter / X Handle <span className="text-muted-foreground font-normal">(optional)</span></FormLabel>
                <FormControl>
                  <Input placeholder="@username" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="linkedInUrl"
            render={({ field }) => (
              <FormItem>
                <FormLabel>LinkedIn URL <span className="text-muted-foreground font-normal">(optional)</span></FormLabel>
                <FormControl>
                  <Input placeholder="https://linkedin.com/in/…" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="flex items-center gap-2 pt-1">
          <input
            type="checkbox"
            id="isStaff"
            className="w-4 h-4 rounded border-border"
            checked={form.watch("isStaff")}
            onChange={(e) => form.setValue("isStaff", e.target.checked)}
          />
          <label htmlFor="isStaff" className="text-sm text-muted-foreground cursor-pointer">
            Mark as SignalAI Staff author
          </label>
        </div>

        <div className="flex justify-end pt-2">
          <Button type="submit" disabled={isLoading}>
            {isLoading ? "Saving…" : initial?.name ? "Save Changes" : "Create Author"}
          </Button>
        </div>
      </form>
    </Form>
  );
}

function EditAuthorDialog({ author, onClose }: { author: AuthorProfile; onClose: () => void }) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const { mutate: updateAuthor, isPending } = useUpdateAuthor({
    mutation: {
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: getListAuthorsQueryKey() });
        toast({ title: "Author updated" });
        onClose();
      },
      onError: (err: unknown) => {
        const msg = err instanceof Error ? err.message : "Failed to update author";
        toast({ title: "Error", description: msg, variant: "destructive" });
      },
    },
  });

  const handleSubmit = (data: AuthorFormValues) => {
    const payload: UpdateAuthorInput = {
      name: data.name,
      bio: data.bio || null,
      avatarUrl: data.avatarUrl || null,
      twitterHandle: data.twitterHandle || null,
      linkedInUrl: data.linkedInUrl || null,
      isStaff: data.isStaff,
    };
    updateAuthor({ id: author.id, data: payload });
  };

  return (
    <AuthorForm
      initial={{
        name: author.name,
        slug: author.slug,
        bio: author.bio ?? "",
        avatarUrl: author.avatarUrl ?? "",
        twitterHandle: author.twitterHandle ?? "",
        linkedInUrl: author.linkedInUrl ?? "",
        isStaff: author.isStaff,
      }}
      onSubmit={handleSubmit}
      isLoading={isPending}
    />
  );
}

function DeactivateButton({ author }: { author: AuthorProfile }) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const { mutate: updateAuthor, isPending } = useUpdateAuthor({
    mutation: {
      onSuccess: (updated) => {
        qc.invalidateQueries({ queryKey: getListAuthorsQueryKey() });
        toast({
          title: updated.isActive ? "Author reactivated" : "Author deactivated",
          description: updated.isActive
            ? `${updated.name} is now active and visible on the site.`
            : `${updated.name} has been deactivated.`,
        });
      },
      onError: (err: unknown) => {
        const msg = err instanceof Error ? err.message : "Failed to update author";
        toast({ title: "Error", description: msg, variant: "destructive" });
      },
    },
  });

  const toggle = () => updateAuthor({ id: author.id, data: { isActive: !author.isActive } });

  return (
    <Button
      variant="ghost"
      size="sm"
      className={`shrink-0 gap-1.5 ${author.isActive ? "text-muted-foreground hover:text-destructive" : "text-muted-foreground hover:text-green-600"}`}
      onClick={toggle}
      disabled={isPending}
      title={author.isActive ? "Deactivate author" : "Reactivate author"}
    >
      {author.isActive ? (
        <><PowerOff className="w-3.5 h-3.5" /> Deactivate</>
      ) : (
        <><Power className="w-3.5 h-3.5" /> Reactivate</>
      )}
    </Button>
  );
}

export default function Authors() {
  const { data: authors = [], isLoading } = useListAuthors();
  const qc = useQueryClient();
  const { toast } = useToast();
  const [createOpen, setCreateOpen] = useState(false);
  const [editingAuthor, setEditingAuthor] = useState<AuthorProfile | null>(null);

  const { mutate: createAuthor, isPending: isCreating } = useCreateAuthor({
    mutation: {
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: getListAuthorsQueryKey() });
        toast({ title: "Author created" });
        setCreateOpen(false);
      },
      onError: (err: unknown) => {
        const msg = err instanceof Error ? err.message : "Failed to create author";
        toast({ title: "Error", description: msg, variant: "destructive" });
      },
    },
  });

  const handleCreate = (data: AuthorFormValues) => {
    const payload: CreateAuthorInput = {
      name: data.name,
      slug: data.slug,
      bio: data.bio || undefined,
      avatarUrl: data.avatarUrl || undefined,
      twitterHandle: data.twitterHandle || undefined,
      linkedInUrl: data.linkedInUrl || undefined,
      isStaff: data.isStaff,
    };
    createAuthor(payload);
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Authors</h1>
            <p className="text-muted-foreground text-sm mt-1">
              Manage the author roster. Authors can be assigned to articles and case studies.
            </p>
          </div>
          <Dialog open={createOpen} onOpenChange={setCreateOpen}>
            <DialogTrigger asChild>
              <Button className="gap-1.5">
                <Plus className="w-4 h-4" />
                Add Author
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>Add New Author</DialogTitle>
              </DialogHeader>
              <AuthorForm onSubmit={handleCreate} isLoading={isCreating} />
            </DialogContent>
          </Dialog>
        </div>

        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-20 rounded-xl border border-border bg-muted/30 animate-pulse" />
            ))}
          </div>
        ) : authors.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center border border-dashed border-border rounded-xl">
            <Users className="w-10 h-10 text-muted-foreground mb-3" />
            <h3 className="font-semibold text-foreground mb-1">No authors yet</h3>
            <p className="text-muted-foreground text-sm max-w-xs">
              Create your first author profile to start assigning bylines to articles and case studies.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-border border border-border rounded-xl overflow-hidden">
            {authors.map((author) => (
              <div
                key={author.id}
                className="flex items-start gap-4 p-5 bg-background hover:bg-muted/30 transition-colors"
              >
                <AuthorAvatar author={author} size="md" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`font-semibold ${author.isActive ? "text-foreground" : "text-muted-foreground line-through"}`}>{author.name}</span>
                    {author.isStaff && (
                      <span className="text-xs font-medium bg-primary/10 text-primary rounded-full px-2 py-0.5">
                        Staff
                      </span>
                    )}
                    {!author.isActive && (
                      <span className="text-xs font-medium bg-destructive/10 text-destructive rounded-full px-2 py-0.5">
                        Inactive
                      </span>
                    )}
                    <span className="text-xs text-muted-foreground font-mono">/authors/{author.slug}</span>
                  </div>
                  {author.bio && (
                    <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{author.bio}</p>
                  )}
                  <div className="flex items-center gap-3 mt-2">
                    {author.twitterHandle && (
                      <a
                        href={`https://twitter.com/${author.twitterHandle.replace(/^@/, "")}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                      >
                        <Twitter className="w-3 h-3" />
                        {author.twitterHandle}
                      </a>
                    )}
                    {author.linkedInUrl && (
                      <a
                        href={author.linkedInUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                      >
                        <Linkedin className="w-3 h-3" />
                        LinkedIn
                      </a>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <Dialog
                    open={editingAuthor?.id === author.id}
                    onOpenChange={(open) => {
                      if (!open) setEditingAuthor(null);
                      else setEditingAuthor(author);
                    }}
                  >
                    <DialogTrigger asChild>
                      <Button variant="ghost" size="sm" className="gap-1.5 text-muted-foreground hover:text-foreground">
                        <Pencil className="w-3.5 h-3.5" />
                        Edit
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-lg">
                      <DialogHeader>
                        <DialogTitle>Edit Author</DialogTitle>
                      </DialogHeader>
                      {editingAuthor?.id === author.id && (
                        <EditAuthorDialog author={author} onClose={() => setEditingAuthor(null)} />
                      )}
                    </DialogContent>
                  </Dialog>
                  <DeactivateButton author={author} />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
