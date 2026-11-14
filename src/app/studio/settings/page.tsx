"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { Avatar, Button, Card, ErrorText, Field } from "@/components/ui";
import { api, ApiError } from "@/lib/client/api";
import { useMe } from "@/lib/client/hooks";
import type { Me } from "@/lib/types";

export default function SettingsPage() {
  const me = useMe();
  const router = useRouter();
  return (
    <>
      <h1 className="font-display text-3xl font-bold">Settings</h1>
      {me.data ? <ProfileForm key={me.data.id} me={me.data} /> : null}
      <Card title="Security">
        <p className="mb-3 text-sm text-muted">
          Manage devices, passwords and linked sign-ins in the Lumo app under
          Settings.
        </p>
        <Button
          kind="ghost"
          onClick={async () => {
            if (!confirm("Sign out of Lumo on every device?")) return;
            await api.auth.logout(true).catch(() => undefined);
            router.replace("/login");
          }}
        >
          Sign out everywhere
        </Button>
      </Card>
    </>
  );
}

function ProfileForm({ me }: { me: Me }) {
  const qc = useQueryClient();
  const file = useRef<HTMLInputElement>(null);
  const [name, setName] = useState(me.display_name);
  const [handle, setHandle] = useState(me.handle);
  const [bio, setBio] = useState(me.bio);
  const [avatar, setAvatar] = useState(me.avatar_url);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<unknown>(null);

  const save = useMutation({
    mutationFn: () =>
      api.updateMe({
        display_name: name.trim(),
        handle: handle.trim().replace(/^@/, ""),
        bio: bio.trim(),
        avatar_url: avatar || undefined,
      }),
    onSuccess: (m) => qc.setQueryData(["me"], m),
  });
  const fields = save.error instanceof ApiError ? save.error.fields : undefined;

  async function upload(f: File) {
    setUploadError(null);
    if (!["image/jpeg", "image/png", "image/webp"].includes(f.type))
      return setUploadError(new Error("Use a JPEG, PNG or WebP image."));
    if (f.size > 5 * 1024 * 1024)
      return setUploadError(new Error("Images can be at most 5 MB."));
    setUploading(true);
    try {
      const up = await api.media.image("avatar", f.type, f.size);
      const r = await fetch(up.upload_url, {
        method: "PUT",
        body: f,
        headers: { "Content-Type": f.type },
      });
      if (!r.ok) throw new Error("Upload failed. Try again.");
      setAvatar(up.url);
    } catch (e) {
      setUploadError(e);
    } finally {
      setUploading(false);
    }
  }

  return (
    <Card title="Profile">
      <form
        className="flex max-w-lg flex-col gap-4"
        onSubmit={(e) => {
          e.preventDefault();
          save.mutate();
        }}
      >
        <div className="flex items-center gap-4">
          <Avatar src={avatar} name={name} size={72} />
          <input
            ref={file}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={(e) =>
              e.target.files?.[0] && void upload(e.target.files[0])
            }
          />
          <Button
            type="button"
            kind="secondary"
            busy={uploading}
            onClick={() => file.current?.click()}
          >
            Change photo
          </Button>
        </div>
        <ErrorText error={uploadError} />
        <Field
          label="Name"
          value={name}
          maxLength={50}
          onChange={(e) => setName(e.target.value)}
          error={fields?.display_name}
        />
        <Field
          label="Username"
          value={handle}
          maxLength={24}
          onChange={(e) => setHandle(e.target.value)}
          error={fields?.handle}
        />
        <div className="flex flex-col gap-1.5">
          <label htmlFor="bio" className="text-xs font-semibold text-muted">
            Bio
          </label>
          <textarea
            id="bio"
            value={bio}
            maxLength={160}
            onChange={(e) => setBio(e.target.value)}
            className="min-h-20 rounded-xl border border-line bg-bg p-3"
          />
        </div>
        {!fields ? <ErrorText error={save.error} /> : null}
        {save.isSuccess ? <p className="text-sm text-success">Saved.</p> : null}
        <Button
          type="submit"
          className="self-start"
          busy={save.isPending}
          disabled={uploading}
        >
          Save profile
        </Button>
      </form>
    </Card>
  );
}
