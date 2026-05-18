export type SignInInput = {
	email: string;
	password: string;
};

export type SignUpInput = {
	email: string;
	name: string;
	password: string;
};

export type TodoCreateInput = {
	text: string;
};

export type TodoToggleInput = {
	completed: boolean;
	id: number;
};

export type TodoDeleteInput = {
	id: number;
};

export type MediaRecordIdInput = {
	id: string;
};
