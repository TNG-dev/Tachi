import Icon from "components/util/Icon";
import React from "react";
import { SetState } from "types/react";

export default function MobileMenuToggle({
	state,
	setState,
}: {
	state: boolean;
	setState: SetState<boolean>;
}) {
	return (
		<button
			aria-controls="mobile-menu"
			aria-label="Toggle Navigation"
			aria-expanded={state}
			onClick={() => setState((prevState) => !prevState)}
			className="d-block d-lg-none h-14 w-14 pt-1 rounded border-0 bg-transparent text-body display-6 focus-visible-ring "
		>
			<Icon type="bars" />
		</button>
	);
}
