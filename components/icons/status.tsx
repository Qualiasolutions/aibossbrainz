import type { SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement> & {
	size?: number;
};

export const LoaderIcon = ({ size = 16 }: { size?: number }) => {
	return (
		<svg
			height={size}
			strokeLinejoin="round"
			style={{ color: "currentcolor" }}
			viewBox="0 0 16 16"
			width={size}
		>
			<g clipPath="url(#clip0_2393_1490)">
				<path d="M8 0V4" stroke="currentColor" strokeWidth="1.5" />
				<path
					d="M8 16V12"
					opacity="0.5"
					stroke="currentColor"
					strokeWidth="1.5"
				/>
				<path
					d="M3.29773 1.52783L5.64887 4.7639"
					opacity="0.9"
					stroke="currentColor"
					strokeWidth="1.5"
				/>
				<path
					d="M12.7023 1.52783L10.3511 4.7639"
					opacity="0.1"
					stroke="currentColor"
					strokeWidth="1.5"
				/>
				<path
					d="M12.7023 14.472L10.3511 11.236"
					opacity="0.4"
					stroke="currentColor"
					strokeWidth="1.5"
				/>
				<path
					d="M3.29773 14.472L5.64887 11.236"
					opacity="0.6"
					stroke="currentColor"
					strokeWidth="1.5"
				/>
				<path
					d="M15.6085 5.52783L11.8043 6.7639"
					opacity="0.2"
					stroke="currentColor"
					strokeWidth="1.5"
				/>
				<path
					d="M0.391602 10.472L4.19583 9.23598"
					opacity="0.7"
					stroke="currentColor"
					strokeWidth="1.5"
				/>
				<path
					d="M15.6085 10.4722L11.8043 9.2361"
					opacity="0.3"
					stroke="currentColor"
					strokeWidth="1.5"
				/>
				<path
					d="M0.391602 5.52783L4.19583 6.7639"
					opacity="0.8"
					stroke="currentColor"
					strokeWidth="1.5"
				/>
			</g>
			<defs>
				<clipPath id="clip0_2393_1490">
					<rect fill="white" height="16" width="16" />
				</clipPath>
			</defs>
		</svg>
	);
};

export const CheckCircleFillIcon = ({
	size = 16,
	className,
	height,
	width,
	...props
}: IconProps) => {
	const finalHeight = height ?? size;
	const finalWidth = width ?? size;
	return (
		<svg
			className={className}
			height={finalHeight}
			strokeLinejoin="round"
			style={{ color: "currentcolor" }}
			viewBox="0 0 16 16"
			width={finalWidth}
			{...props}
		>
			<path
				clipRule="evenodd"
				d="M16 8C16 12.4183 12.4183 16 8 16C3.58172 16 0 12.4183 0 8C0 3.58172 3.58172 0 8 0C12.4183 0 16 3.58172 16 8ZM11.5303 6.53033L12.0607 6L11 4.93934L10.4697 5.46967L6.5 9.43934L5.53033 8.46967L5 7.93934L3.93934 9L4.46967 9.53033L5.96967 11.0303C6.26256 11.3232 6.73744 11.3232 7.03033 11.0303L11.5303 6.53033Z"
				fill="currentColor"
				fillRule="evenodd"
			/>
		</svg>
	);
};

export const ThumbUpIcon = ({ size = 16 }: { size?: number }) => (
	<svg
		height={size}
		strokeLinejoin="round"
		style={{ color: "currentcolor" }}
		viewBox="0 0 16 16"
		width={size}
	>
		<path
			clipRule="evenodd"
			d="M6.89531 2.23972C6.72984 2.12153 6.5 2.23981 6.5 2.44315V5.25001C6.5 6.21651 5.7165 7.00001 4.75 7.00001H2.5V13.5H12.1884C12.762 13.5 13.262 13.1096 13.4011 12.5532L14.4011 8.55318C14.5984 7.76425 14.0017 7.00001 13.1884 7.00001H9.25H8.5V6.25001V3.51458C8.5 3.43384 8.46101 3.35807 8.39531 3.31114L6.89531 2.23972ZM5 2.44315C5 1.01975 6.6089 0.191779 7.76717 1.01912L9.26717 2.09054C9.72706 2.41904 10 2.94941 10 3.51458V5.50001H13.1884C14.9775 5.50001 16.2903 7.18133 15.8563 8.91698L14.8563 12.917C14.5503 14.1412 13.4503 15 12.1884 15H1.75H1V14.25V6.25001V5.50001H1.75H4.75C4.88807 5.50001 5 5.38808 5 5.25001V2.44315Z"
			fill="currentColor"
			fillRule="evenodd"
		/>
	</svg>
);

export const ThumbDownIcon = ({ size = 16 }: { size?: number }) => (
	<svg
		height={size}
		strokeLinejoin="round"
		style={{ color: "currentcolor" }}
		viewBox="0 0 16 16"
		width={size}
	>
		<path
			clipRule="evenodd"
			d="M6.89531 13.7603C6.72984 13.8785 6.5 13.7602 6.5 13.5569V10.75C6.5 9.7835 5.7165 9 4.75 9H2.5V2.5H12.1884C12.762 2.5 13.262 2.89037 13.4011 3.44683L14.4011 7.44683C14.5984 8.23576 14.0017 9 13.1884 9H9.25H8.5V9.75V12.4854C8.5 12.5662 8.46101 12.6419 8.39531 12.6889L6.89531 13.7603ZM5 13.5569C5 14.9803 6.6089 15.8082 7.76717 14.9809L9.26717 13.9095C9.72706 13.581 10 13.0506 10 12.4854V10.5H13.1884C14.9775 10.5 16.2903 8.81868 15.8563 7.08303L14.8563 3.08303C14.5503 1.85882 13.4503 1 12.1884 1H1.75H1V1.75V9.75V10.5H1.75H4.75C4.88807 10.5 5 10.6119 5 10.75V13.5569Z"
			fill="currentColor"
			fillRule="evenodd"
		/>
	</svg>
);

export const InfoIcon = ({ size = 16 }: { size?: number }) => {
	return (
		<svg
			height={size}
			strokeLinejoin="round"
			style={{ color: "currentcolor" }}
			viewBox="0 0 16 16"
			width={size}
		>
			<path
				clipRule="evenodd"
				d="M16 8C16 12.4183 12.4183 16 8 16C3.58172 16 0 12.4183 0 8C0 3.58172 3.58172 0 8 0C12.4183 0 16 3.58172 16 8ZM6.25002 7H7.00002H7.75C8.30229 7 8.75 7.44772 8.75 8V11.5V12.25H7.25V11.5V8.5H7.00002H6.25002V7ZM8 6C8.55229 6 9 5.55228 9 5C9 4.44772 8.55229 4 8 4C7.44772 4 7 4.44772 7 5C7 5.55228 7.44772 6 8 6Z"
				fill="currentColor"
				fillRule="evenodd"
			/>
		</svg>
	);
};

export const WarningIcon = ({ size = 16 }: { size?: number }) => {
	return (
		<svg
			height={size}
			strokeLinejoin="round"
			style={{ color: "currentcolor" }}
			viewBox="0 0 16 16"
			width={size}
		>
			<path
				clipRule="evenodd"
				d="M8.55846 0.5C9.13413 0.5 9.65902 0.829456 9.90929 1.34788L15.8073 13.5653C16.1279 14.2293 15.6441 15 14.9068 15H1.09316C0.355835 15 -0.127943 14.2293 0.192608 13.5653L6.09065 1.34787C6.34092 0.829454 6.86581 0.5 7.44148 0.5H8.55846ZM8.74997 4.75V5.5V8V8.75H7.24997V8V5.5V4.75H8.74997ZM7.99997 12C8.55226 12 8.99997 11.5523 8.99997 11C8.99997 10.4477 8.55226 10 7.99997 10C7.44769 10 6.99997 10.4477 6.99997 11C6.99997 11.5523 7.44769 12 7.99997 12Z"
				fill="currentColor"
				fillRule="evenodd"
			/>
		</svg>
	);
};

export function FileTextIcon({ size = 16 }: { size?: number }) {
	return (
		<svg
			height={size}
			strokeLinejoin="round"
			viewBox="0 0 16 16"
			width={size}
			style={{ color: "currentColor" }}
		>
			<path
				fillRule="evenodd"
				clipRule="evenodd"
				d="M14.5 13.5V6.5H10.5V2.5H3.5V13.5H14.5ZM4 1H11.5L16 5.5V14C16 14.8284 15.3284 15.5 14.5 15.5H3.5C2.67157 15.5 2 14.8284 2 14V3C2 2.17157 2.67157 1.5 3.5 1.5L4 1ZM5 7.5H11V9H5V7.5ZM5 10.5H11V12H5V10.5Z"
				fill="currentColor"
			/>
		</svg>
	);
}

export function FileSpreadsheetIcon({ size = 16 }: { size?: number }) {
	return (
		<svg
			height={size}
			strokeLinejoin="round"
			viewBox="0 0 16 16"
			width={size}
			style={{ color: "currentColor" }}
		>
			<path
				fillRule="evenodd"
				clipRule="evenodd"
				d="M14.5 13.5V6.5H10.5V2.5H3.5V13.5H14.5ZM4 1H11.5L16 5.5V14C16 14.8284 15.3284 15.5 14.5 15.5H3.5C2.67157 15.5 2 14.8284 2 14V3C2 2.17157 2.67157 1.5 3.5 1.5L4 1ZM5 7H7V8.5H5V7ZM8.5 7H11V8.5H8.5V7ZM5 10H7V11.5H5V10ZM8.5 10H11V11.5H8.5V10Z"
				fill="currentColor"
			/>
		</svg>
	);
}

export const EyeIcon = ({ size = 16 }: { size?: number }) => {
	return (
		<svg
			height={size}
			strokeLinejoin="round"
			style={{ color: "currentcolor" }}
			viewBox="0 0 16 16"
			width={size}
		>
			<path
				clipRule="evenodd"
				d="M4.02168 4.76932C6.11619 2.33698 9.88374 2.33698 11.9783 4.76932L14.7602 7.99999L11.9783 11.2307C9.88374 13.663 6.1162 13.663 4.02168 11.2307L1.23971 7.99999L4.02168 4.76932ZM13.1149 3.79054C10.422 0.663244 5.57797 0.663247 2.88503 3.79054L-0.318359 7.5106V8.48938L2.88503 12.2094C5.57797 15.3367 10.422 15.3367 13.1149 12.2094L16.3183 8.48938V7.5106L13.1149 3.79054ZM6.49997 7.99999C6.49997 7.17157 7.17154 6.49999 7.99997 6.49999C8.82839 6.49999 9.49997 7.17157 9.49997 7.99999C9.49997 8.82842 8.82839 9.49999 7.99997 9.49999C7.17154 9.49999 6.49997 8.82842 6.49997 7.99999ZM7.99997 4.99999C6.34311 4.99999 4.99997 6.34314 4.99997 7.99999C4.99997 9.65685 6.34311 11 7.99997 11C9.65682 11 11 9.65685 11 7.99999C11 6.34314 9.65682 4.99999 7.99997 4.99999Z"
				fill="currentColor"
				fillRule="evenodd"
			/>
		</svg>
	);
};
