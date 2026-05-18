import type { LocaleDefinition } from "@de100/apps-lms-i18n";

export type AppLocaleCode = "en" | "ar";

export const enMessages = {
	auth: {
		signIn: {
			description: "Sign in to review budgets, transactions, and recent account activity.",
			emailLabel: "Email",
			eyebrow: "Authentication",
			passwordLabel: "Password",
			submit: "Sign In",
			submitting: "Signing in...",
			switchPrompt: "Need an account? Sign up",
			title: "Welcome back",
		},
		signUp: {
			description: "Create an account to manage budgets, categories, and spending trends.",
			emailLabel: "Email",
			eyebrow: "Create account",
			nameLabel: "Name",
			passwordLabel: "Password",
			submit: "Sign Up",
			submitting: "Creating account...",
			switchPrompt: "Already have an account? Sign in",
			title: "Start tracking",
		},
	},
	apiReference: {
		fallbackTitle: "Shared API surface",
		labels: {
			no: "no",
			required: "Required",
			requestBody: "Request body",
			responses: "Responses",
			server: "Server",
			version: "Version",
			yes: "yes",
		},
		metaTitle: "API Reference",
		status: {
			loadError: "Unable to load API reference.",
			loading: "Loading API reference...",
			noDescription: "No description",
		},
		subtitle: "from the same-origin OpenAPI spec.",
		title: "OpenAPI reference",
	},
	dashboard: {
		api: {
			description: "Protected dashboard data is only fetched once a valid session exists.",
			title: "Private API status",
		},
		metaTitle: "Dashboard",
		page: {
			description: "This view is now driven by the shared auth session and typed oRPC queries.",
			eyebrow: "Private route",
			openTodos: "Open todos",
			title: "Dashboard",
			welcomePrefix: "Welcome",
			welcomeSuffix:
				"Your dashboard is now reading private data and todo state through the shared LMS API surface.",
		},
		stats: {
			done: "done",
			open: "open",
			tasksSuffix: "tasks",
		},
		status: {
			empty: "No tasks yet. Create your first todo to populate the dashboard.",
			loadingPage: "Loading your dashboard...",
			loadingPrivateData: "Loading private data...",
			loadingSummary: "Loading your task summary...",
			privateDataError: "Private API request failed.",
			recentDone: "Done",
			recentOpen: "Open",
			summaryError: "Failed to load task summary.",
		},
		todos: {
			description: "A quick view of the current signed-in user's tasks.",
			title: "Todo snapshot",
		},
	},
	header: {
		language: "Language",
		nav: {
			dashboard: "Dashboard",
			home: "Home",
			login: "Login",
			media: "Media",
			todos: "Todos",
		},
		primaryNavigation: "Primary",
		theme: "Theme",
		themes: {
			dark: "Dark",
			light: "Light",
			system: "System",
		},
	},
	home: {
		accounts: {
			description:
				"Use these seeded accounts to demo auth boundaries, empty states, and owner-scoped data.",
			empty: "Empty account for zero-state checks",
			owner: "Primary seeded account with mixed todos and media fixtures",
			passwordLabel: "Password",
			title: "Seeded demo accounts",
			viewer: "Secondary account for cross-user checks",
		},
		api: {
			description:
				"The landing page now checks the same typed oRPC health route used by the rest of the app.",
			error: "Current server not reachable from this app.",
			pending: "Checking shared oRPC health endpoint...",
			successPrefix: "Shared API responded with:",
			title: "Shared API status",
		},
		ctas: {
			apiReference: "Open API reference",
			auth: "Open auth flow",
			dashboard: "Open dashboard",
			media: "Open media",
			todos: "Open todos",
		},
		description:
			"This is the active SolidStart app for auth, shared API access, user-scoped todos, and Cloudflare deployment primitives inside the monorepo.",
		eyebrow: "Unified runtime",
		features: {
			description:
				"Each route below is already wired through the shared LMS packages and meant to be exercised directly.",
			reference: "OpenAPI docs generated from the shared router",
			restoredAuth: "Better Auth email/password flow using shared validators and session state",
			storage: "Media upload, draft confirmation, delete, and signed delivery capabilities",
			tasks: "Typed oRPC and TanStack Query flows for private dashboard and todo CRUD",
			title: "What you can demo right now",
		},
		lede: "Use the auth flow to establish a session, then move into the dashboard and todos routes to verify the shared stack end to end.",
		title: "DE100 LMS starter",
	},
	meta: {
		appTitle: "DE100 LMS",
	},
	media: {
		actions: {
			confirmUpload: "Confirm upload",
			deleteAria: "Delete media",
			generateSignedUrl: "Generate signed URL",
			openAppUrl: "Open app URL",
			openDirectUrl: "Open direct URL",
			openSignedUrl: "Open signed URL",
			uploadFile: "Upload file",
		},
		badges: {
			authAccess: "R2 + auth-gated access",
			draftsSuffix: "drafts",
			readySuffix: "ready",
		},
		driver: {
			local: "Local files",
			r2: "Cloudflare R2",
		},
		fields: {
			file: "File",
			visibility: "Visibility",
			visibilityDescription:
				"Use public for cache-friendly assets and private for authenticated reads.",
		},
		metaTitle: "Media",
		page: {
			description:
				"Upload files into a draft library, confirm the ones you want to keep, and delete the rest.",
			eyebrow: "Cloudflare storage",
			sessionPrefix: "Uploads are scoped to",
			sessionSuffix:
				"Public files only expose direct URLs after confirmation, while private objects stay behind the authenticated route.",
			title: "Managed media",
		},
		sections: {
			backendDescription:
				"The media page now reports the active storage backend and which delivery features it can support.",
			backendTitle: "Backend capabilities",
			draftsDescription: "Draft uploads stay owner-managed until you confirm them.",
			draftsTitle: "Draft uploads",
			readyDescription: "Confirmed items can be reopened and managed from here.",
			readyTitle: "Ready media library",
			uploadDescription:
				"These routes depend on Cloudflare request bindings. Use the Cloudflare-backed dev runtime when testing uploads end to end.",
			uploadTitle: "Upload file",
		},
		status: {
			backendLabel: "Backend",
			backendLoadError: "Failed to load backend capabilities.",
			badges: {
				deleted: "deleted",
				draft: "draft",
				ready: "ready",
			},
			bucketLabel: "Bucket",
			confirmFailed: "Failed to confirm media.",
			confirmedPrefix: "Confirmed",
			deleteFailed: "Failed to delete media.",
			deletedNotice: "Media removed from storage and metadata records.",
			directPublicReady: "Direct public delivery available",
			directPublicUnavailable: "Direct public delivery not available",
			loadingBackend: "Loading backend capabilities...",
			loadError: "Failed to load media library.",
			loadingDrafts: "Loading media drafts...",
			missingFile: "Choose a file before uploading.",
			noDrafts: "No draft uploads yet.",
			noReady: "No confirmed media yet.",
			signedAccessFailed: "Failed to issue a signed media URL.",
			signedAccessLabel: "Signed URL ready:",
			signedAccessReady: "Signed media URL issued successfully.",
			signedDeliveryReady: "Signed delivery supported",
			signedDeliveryUnavailable: "Signed delivery not available yet",
			storedDraftNotice: "Upload stored as draft. Confirm it or delete it from the library below.",
			unavailableBucket: "Unavailable in current runtime",
			uploadConfirmedNotice: "Draft confirmed and ready for regular access.",
			uploadFailed: "Upload failed.",
		},
		units: {
			bytes: "bytes",
		},
		visibility: {
			private: "Private",
			public: "Public",
		},
	},
	todos: {
		actions: {
			add: "Add",
			deleteAria: "Delete todo",
		},
		form: {
			label: "Add a new task",
			placeholder: "Add a new task",
		},
		metaTitle: "Todos",
		page: {
			description:
				"These tasks now come from the typed oRPC client and are scoped to the signed-in user.",
			eyebrow: "Session-owned tasks",
			title: "Todos",
		},
		stats: {
			doneSuffix: "done",
			openSuffix: "open",
		},
		status: {
			createError: "Failed to create todo.",
			deleteError: "Failed to delete todo.",
			empty: "No todos yet. Add one above.",
			loadError: "Failed to load todos.",
			loading: "Loading todos...",
			updateError: "Failed to update todo.",
		},
	},
	userMenu: {
		signIn: "Sign In",
		signOut: "Sign Out",
	},
};

export type AppMessages = typeof enMessages;

export const arMessages: AppMessages = {
	auth: {
		signIn: {
			description: "سجّل الدخول لمراجعة الميزانيات والمعاملات وآخر نشاط للحساب.",
			emailLabel: "البريد الإلكتروني",
			eyebrow: "المصادقة",
			passwordLabel: "كلمة المرور",
			submit: "تسجيل الدخول",
			submitting: "جارٍ تسجيل الدخول...",
			switchPrompt: "بحاجة إلى حساب؟ أنشئ حسابًا",
			title: "مرحبًا بعودتك",
		},
		signUp: {
			description: "أنشئ حسابًا لإدارة الميزانيات والفئات واتجاهات الإنفاق.",
			emailLabel: "البريد الإلكتروني",
			eyebrow: "إنشاء حساب",
			nameLabel: "الاسم",
			passwordLabel: "كلمة المرور",
			submit: "إنشاء حساب",
			submitting: "جارٍ إنشاء الحساب...",
			switchPrompt: "لديك حساب بالفعل؟ سجّل الدخول",
			title: "ابدأ التتبع",
		},
	},
	apiReference: {
		fallbackTitle: "واجهة برمجية مشتركة",
		labels: {
			no: "لا",
			required: "مطلوب",
			requestBody: "جسم الطلب",
			responses: "الاستجابات",
			server: "الخادم",
			version: "الإصدار",
			yes: "نعم",
		},
		metaTitle: "مرجع الواجهة البرمجية",
		status: {
			loadError: "تعذر تحميل مرجع الواجهة البرمجية.",
			loading: "جارٍ تحميل مرجع الواجهة البرمجية...",
			noDescription: "لا يوجد وصف",
		},
		subtitle: "من مواصفة OpenAPI على نفس النطاق.",
		title: "مرجع OpenAPI",
	},
	dashboard: {
		api: {
			description: "لا يتم جلب بيانات لوحة التحكم المحمية إلا عند وجود جلسة صالحة.",
			title: "حالة الواجهة البرمجية الخاصة",
		},
		metaTitle: "لوحة التحكم",
		page: {
			description:
				"أصبحت هذه الواجهة الآن معتمدة على جلسة المصادقة المشتركة واستعلامات oRPC المعرّفة نوعيًا.",
			eyebrow: "مسار خاص",
			openTodos: "افتح المهام",
			title: "لوحة التحكم",
			welcomePrefix: "مرحبًا",
			welcomeSuffix:
				"تقرأ لوحة التحكم الآن البيانات الخاصة وحالة المهام من خلال واجهة LMS المشتركة.",
		},
		stats: {
			done: "مكتملة",
			open: "مفتوحة",
			tasksSuffix: "مهام",
		},
		status: {
			empty: "لا توجد مهام بعد. أنشئ مهمتك الأولى لملء لوحة التحكم.",
			loadingPage: "جارٍ تحميل لوحة التحكم...",
			loadingPrivateData: "جارٍ تحميل البيانات الخاصة...",
			loadingSummary: "جارٍ تحميل ملخص المهام...",
			privateDataError: "فشل طلب الواجهة البرمجية الخاصة.",
			recentDone: "مكتملة",
			recentOpen: "مفتوحة",
			summaryError: "فشل تحميل ملخص المهام.",
		},
		todos: {
			description: "عرض سريع لمهام المستخدم المسجّل دخوله حاليًا.",
			title: "ملخص المهام",
		},
	},
	header: {
		language: "اللغة",
		nav: {
			dashboard: "لوحة التحكم",
			home: "الرئيسية",
			login: "تسجيل الدخول",
			media: "الوسائط",
			todos: "المهام",
		},
		primaryNavigation: "التنقل الرئيسي",
		theme: "المظهر",
		themes: {
			dark: "داكن",
			light: "فاتح",
			system: "النظام",
		},
	},
	home: {
		accounts: {
			description:
				"استخدم هذه الحسابات المولدة مسبقًا لاختبار حدود المصادقة والحالات الفارغة والبيانات المرتبطة بالمالك.",
			empty: "حساب فارغ لاختبار حالة عدم وجود بيانات",
			owner: "الحساب الأساسي المزود بمهام ووسائط تجريبية متنوعة",
			passwordLabel: "كلمة المرور",
			title: "حسابات تجريبية جاهزة",
			viewer: "حساب ثانوي لاختبارات الفصل بين المستخدمين",
		},
		api: {
			description:
				"تتحقق الصفحة الرئيسية الآن من نفس مسار فحص الصحة المطبوع المستخدم في بقية التطبيق.",
			error: "الخادم الحالي غير متاح من هذا التطبيق.",
			pending: "جارٍ التحقق من مسار صحة oRPC المشترك...",
			successPrefix: "استجابت الواجهة البرمجية المشتركة بـ:",
			title: "حالة الواجهة البرمجية المشتركة",
		},
		ctas: {
			apiReference: "افتح مرجع الواجهة البرمجية",
			auth: "افتح تسجيل الدخول",
			dashboard: "افتح لوحة التحكم",
			media: "افتح الوسائط",
			todos: "افتح المهام",
		},
		description:
			"هذا هو تطبيق SolidStart النشط للمصادقة والوصول إلى الواجهة البرمجية المشتركة ومهام المستخدم وتهيئة نشر Cloudflare داخل المستودع الموحد.",
		eyebrow: "بيئة تشغيل موحدة",
		features: {
			description: "كل مسار أدناه متصل بالفعل بحزم LMS المشتركة ومصمم ليتم اختباره مباشرة.",
			reference: "توثيق OpenAPI مولد من الموجه المشترك",
			restoredAuth: "تدفق Better Auth بالبريد الإلكتروني وكلمة المرور مع مدققات مشتركة وحالة جلسة",
			storage: "رفع الوسائط وتأكيد المسودات والحذف وقدرات التسليم الموقّع",
			tasks: "تدفقات oRPC وTanStack Query للوحة التحكم الخاصة وعمليات CRUD للمهام",
			title: "ما الذي يمكنك عرضه الآن",
		},
		lede: "استخدم مسار المصادقة لإنشاء جلسة، ثم انتقل إلى لوحة التحكم وصفحة المهام للتحقق من الحزمة المشتركة من البداية إلى النهاية.",
		title: "بداية منصة DE100 التعليمية",
	},
	meta: {
		appTitle: "منصة DE100 التعليمية",
	},
	media: {
		actions: {
			confirmUpload: "تأكيد الرفع",
			deleteAria: "حذف الوسيط",
			generateSignedUrl: "إنشاء رابط موقّع",
			openAppUrl: "افتح رابط التطبيق",
			openDirectUrl: "افتح الرابط المباشر",
			openSignedUrl: "افتح الرابط الموقّع",
			uploadFile: "رفع ملف",
		},
		badges: {
			authAccess: "R2 + وصول محمي بالمصادقة",
			draftsSuffix: "مسودات",
			readySuffix: "جاهزة",
		},
		driver: {
			local: "ملفات محلية",
			r2: "Cloudflare R2",
		},
		fields: {
			file: "الملف",
			visibility: "إمكانية الوصول",
			visibilityDescription:
				"استخدم العام للملفات المناسبة للتخزين المؤقت والخاص للقراءات الموثقة.",
		},
		metaTitle: "الوسائط",
		page: {
			description: "ارفع الملفات إلى مكتبة مسودات، ثم أكد ما تريد الاحتفاظ به واحذف الباقي.",
			eyebrow: "تخزين Cloudflare",
			sessionPrefix: "الملفات المرفوعة مرتبطة بـ",
			sessionSuffix:
				"الملفات العامة تكشف الروابط المباشرة فقط بعد التأكيد، بينما تبقى العناصر الخاصة خلف المسار الموثق.",
			title: "إدارة الوسائط",
		},
		sections: {
			backendDescription:
				"تعرض صفحة الوسائط الآن الواجهة التخزينية النشطة والميزات التي يمكنها دعمها.",
			backendTitle: "قدرات الواجهة التخزينية",
			draftsDescription: "تبقى المسودات تحت إدارة المالك حتى تؤكدها.",
			draftsTitle: "المرفوعات كمسودة",
			readyDescription: "يمكن إعادة فتح العناصر المؤكدة وإدارتها من هنا.",
			readyTitle: "مكتبة الوسائط الجاهزة",
			uploadDescription:
				"تعتمد هذه المسارات على ارتباطات طلب Cloudflare. استخدم بيئة التطوير المدعومة من Cloudflare عند اختبار الرفع من البداية إلى النهاية.",
			uploadTitle: "رفع ملف",
		},
		status: {
			backendLabel: "الواجهة",
			backendLoadError: "فشل تحميل قدرات الواجهة التخزينية.",
			badges: {
				deleted: "محذوف",
				draft: "مسودة",
				ready: "جاهز",
			},
			bucketLabel: "الحاوية",
			confirmFailed: "فشل تأكيد الوسيط.",
			confirmedPrefix: "تم التأكيد",
			deleteFailed: "فشل حذف الوسيط.",
			deletedNotice: "تمت إزالة الوسيط من التخزين وسجلات البيانات الوصفية.",
			directPublicReady: "التسليم العام المباشر متاح",
			directPublicUnavailable: "التسليم العام المباشر غير متاح",
			loadingBackend: "جارٍ تحميل قدرات الواجهة التخزينية...",
			loadError: "فشل تحميل مكتبة الوسائط.",
			loadingDrafts: "جارٍ تحميل مسودات الوسائط...",
			missingFile: "اختر ملفًا قبل الرفع.",
			noDrafts: "لا توجد مسودات بعد.",
			noReady: "لا توجد وسائط مؤكدة بعد.",
			signedAccessFailed: "فشل إنشاء رابط وسائط موقّع.",
			signedAccessLabel: "الرابط الموقّع جاهز:",
			signedAccessReady: "تم إنشاء رابط الوسائط الموقّع بنجاح.",
			signedDeliveryReady: "التسليم الموقّع مدعوم",
			signedDeliveryUnavailable: "التسليم الموقّع غير متاح بعد",
			storedDraftNotice: "تم حفظ الرفع كمسودة. أكده أو احذفه من المكتبة أدناه.",
			unavailableBucket: "غير متاح في بيئة التشغيل الحالية",
			uploadConfirmedNotice: "تم تأكيد المسودة وأصبحت جاهزة للوصول العادي.",
			uploadFailed: "فشل الرفع.",
		},
		units: {
			bytes: "بايت",
		},
		visibility: {
			private: "خاص",
			public: "عام",
		},
	},
	todos: {
		actions: {
			add: "إضافة",
			deleteAria: "حذف المهمة",
		},
		form: {
			label: "أضف مهمة جديدة",
			placeholder: "أضف مهمة جديدة",
		},
		metaTitle: "المهام",
		page: {
			description: "تأتي هذه المهام الآن من عميل oRPC المطبوع وهي مقيّدة بالمستخدم المسجّل دخوله.",
			eyebrow: "مهام مملوكة للجلسة",
			title: "المهام",
		},
		stats: {
			doneSuffix: "مكتملة",
			openSuffix: "مفتوحة",
		},
		status: {
			createError: "فشل إنشاء المهمة.",
			deleteError: "فشل حذف المهمة.",
			empty: "لا توجد مهام بعد. أضف واحدة أعلاه.",
			loadError: "فشل تحميل المهام.",
			loading: "جارٍ تحميل المهام...",
			updateError: "فشل تحديث المهمة.",
		},
	},
	userMenu: {
		signIn: "تسجيل الدخول",
		signOut: "تسجيل الخروج",
	},
};

export const appLocales: readonly LocaleDefinition<AppLocaleCode, AppMessages>[] = [
	{
		code: "en",
		dir: "ltr",
		label: "English",
		messages: enMessages,
	},
	{
		code: "ar",
		dir: "rtl",
		label: "العربية",
		messages: arMessages,
	},
];

export const defaultLocale: AppLocaleCode = "en";

export function getAppLocaleDefinition(locale: AppLocaleCode | string) {
	const fallbackLocale = appLocales[0];

	if (!fallbackLocale) {
		throw new Error("At least one app locale must be configured.");
	}

	return appLocales.find((candidate) => candidate.code === locale) ?? fallbackLocale;
}
