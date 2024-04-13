import React from "react";
import { api } from "@src/trpc/server";
import { SearchTab } from "./pdf/ui/components/SearchTab";
import Timeline from "./pdf/ui/components/Timeline";
import { SignIn, currentUser } from "@clerk/nextjs";
import Navbar from "./pdf/ui/components/Navbar";


export default async function Page() {
  const clerkUser = await currentUser();

  if (!clerkUser) {
    return (
      <div>
        <SignIn />
      </div>
    );
  }
  // TODO: Map Clerk userid to mongodb id
  const clerkUserEmail = clerkUser?.emailAddresses[0]?.emailAddress;
  const user = await api.user.fetchUser({
    email: clerkUserEmail,
  });

  const followedUsers =
    (await api.user.fetchUsers({
      userEmailList: user?.follows ?? [],
    })) ?? [];
  // Populate timeline with highlights of user and follows.
  const timeline =
    (await api.annotatedPdf.fetchAllAnnotatedPdfs({
      userList: [user.email, ...(user?.follows ?? [])],
    })) ?? [];


  return (
    <main className="h-screen w-screen gap-0 p-4">
      <Navbar users={followedUsers} loggedInUser={user} />
      <Timeline articles={timeline} />
    </main>
  );
}
