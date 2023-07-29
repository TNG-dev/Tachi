import { breakpoints } from "util/constants/breakpoints";
import React, { createContext, useCallback, useEffect, useMemo, useState } from "react";
import { throttle } from "lodash";
import { JustChildren } from "types/react";

export type WindowContextProps = {
	clientWidth: number;
	breakpoint: {
		isSm: boolean;
		isMd: boolean;
		isLg: boolean;
		isXl: boolean;
	};
};

export const WindowContext = createContext<WindowContextProps>({
	clientWidth: 0,
	breakpoint: {
		isSm: false,
		isMd: false,
		isLg: false,
		isXl: false,
	},
});

export function WindowContextProvider({ children }: JustChildren) {
	const getClientWidth = useCallback(() => window.innerWidth || 0, []);

	const [clientWidth, setClientWidth] = useState<number>(getClientWidth());

	const breakpoint = useMemo(
		() => ({
			isSm: clientWidth >= breakpoints.sm,
			isMd: clientWidth >= breakpoints.md,
			isLg: clientWidth >= breakpoints.lg,
			isXl: clientWidth >= breakpoints.xl,
		}),
		[clientWidth]
	);

	useEffect(() => {
		const resize = () => setClientWidth(getClientWidth());
		const throttledResize = throttle(resize, 250);
		window.addEventListener("resize", throttledResize);
		console.log("render");

		return () => {
			window.removeEventListener("resize", throttledResize);
		};
	}, []);
	return (
		<WindowContext.Provider value={{ clientWidth, breakpoint }}>
			{children}
		</WindowContext.Provider>
	);
}
