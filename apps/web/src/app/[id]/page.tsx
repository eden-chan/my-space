import React from "react";
import { api } from "@src/trpc/server";
import { User, clerkClient, currentUser } from "@clerk/nextjs/server";

import Profile from "../pdf/ui/components/ProfilePage";
import Navbar from "../pdf/ui/components/Navbar";

export default async function Page({ params }: { params: { id: string } }) {
  // TODO: handle edgecase of multiple hypthen in names
  const handle = params.id;
  const searchedUser = await api.user.fetchUser({ handle });

  if (!searchedUser) {
    return (
      <div className="h-screen w-screen gap-0 text-black">
        Profile {handle} does not exist
      </div>
    );
  }

  // Get searched user profile picture from Clerk
  const [searchedUserClerk] = (await clerkClient.users.getUserList({
    emailAddress: [searchedUser.email],
  })) as User[];

  //
  // Get all users to populate search bar and timeline
  const clerkUsers = (await clerkClient.users.getUserList()) as User[];
  let userEmails = [];
  for (let i = 0; i < clerkUsers.length; i++) {
    if (clerkUsers[i]?.emailAddresses?.[0]?.emailAddress) {
      userEmails.push(
        clerkUsers[i]?.emailAddresses?.[0]?.emailAddress as string,
      );
    }
  }

  const users = await api.user.fetchUsers({ userEmailList: userEmails });
  const timeline = await api.annotatedPdf.fetchAllHighlights({
    userList: userEmails,
  });

  const _loggedInUser = await currentUser();
  const loggedInUserEmail = _loggedInUser?.emailAddresses[0]
    ?.emailAddress as string;
  const loggedInUser = await api.user.fetchUser({ email: loggedInUserEmail });

  if (!users || !timeline || !_loggedInUser || !loggedInUser) {
    return (
      <div className="h-screen w-screen gap-0 text-black">
        <div>Change Later</div>
      </div>
    );
  }

  return (
    <main className="h-screen w-screen gap-0 bg-[##f8f7f6]">
      <div className="mx-auto py-8 px-4 text-black">
        <Navbar users={users} loggedInUser={loggedInUser} />
        <Profile
          users={users}
          timeline={timeline}
          searchedUser={searchedUser}
          searchedUserImageUrl={searchedUserClerk?.imageUrl as string}
          loggedInUser={loggedInUser}
        />
      </div>
    </main>
  );
}

