import React, { createContext, useState } from "react";
import { UserDocument } from "tachi-common";
import { JustChildren, SetState } from "types/react";

/**
 * Contains the current user's user document.
 */
export const UserContext = createContext<{
	user: UserDocument | null;
	setUser: SetState<UserDocument | null>;
}>({ user: null, setUser: () => void 0 });
UserContext.displayName = "UserContext";

export function UserContextProvider({ children }: JustChildren) {
	const [user, setUser] = useState<UserDocument | null>(null);

	return <UserContext.Provider value={{ user, setUser }}>{children}</UserContext.Provider>;
}
