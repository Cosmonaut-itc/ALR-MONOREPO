"use client"

import { StyleSheet, Platform } from "react-native"
import { StatusBar } from "expo-status-bar"
import { router } from "expo-router"
import { ThemedText } from "@/components/ThemedText"
import { ThemedView } from "@/components/ThemedView"
import { ThemedButton } from "@/components/ThemedButton"
import { Colors } from "@/constants/Colors"
import { useColorScheme } from "@/hooks/useColorScheme"
import { ThemedNumpad } from "@/components/ui/ThemedNumpad"
import { useNumpadStore } from "@/app/stores/baseUserStores"
import { useQuery } from "@tanstack/react-query"
import { getEmployeeByUserId } from "@/lib/fetch-functions"
import { QUERY_KEYS } from "@/lib/query-keys"
import { toast } from "sonner-native"
import React, { useState, useEffect } from "react"
import { useRootUserStore } from "@/app/stores/rootUserStore"

/**
 * Type definition for the employee API response
 */
type EmployeeApiResponse =
	| {
			success: false;
			message: string;
			data: never[];
	  }
	| {
			success: true;
			message: string;
			data: {
				employee: {
					id: string;
					name: string;
					surname: string;
					warehouseId: string;
					passcode: number;
					userId: string | null;
					permissions: string | null;
				};
				permissions: {
					id: string;
					permission: string;
				} | null;
			}[];
	  }
	| undefined;

/**
 * Helper function to check if a passcode matches in the employee data
 * Works with the specific API response structure
 * @param data - The employee API response data
 * @param passcode - The passcode string to match (will be converted to number)
 * @returns true if passcode matches any employee in the response
 */
const findMatchingPasscode = (
	data: unknown,
	passcode: string,
): boolean => {
	// Convert passcode string to number for comparison
	const passcodeNumber = Number(passcode);
	
	// Check if conversion was successful (not NaN)
	if (Number.isNaN(passcodeNumber)) {
		return false;
	}

	const response = data as EmployeeApiResponse;

	// Check if response is undefined
	if (!response) {
		return false;
	}

	// Check if response was unsuccessful
	if (response.success === false) {
		return false;
	}

	// Check if response was successful and has data
	if (response.success === true && Array.isArray(response.data)) {
		// Check each employee in the data array
		return response.data.some((item) => {
			// Compare the employee's passcode (number) with the typed passcode (converted to number)
			return item.employee.passcode === passcodeNumber;
		});
	}

	return false;
};

export default function NumpadScreen() {
    const colorScheme = useColorScheme()
    const isDark = colorScheme === "dark"
    const { value: storedValue, setValue, deleteValue, clearValue } = useNumpadStore()
    const { userId } = useRootUserStore()
    const [shouldQuery, setShouldQuery] = useState(false);

    // Query employee data when shouldQuery is true, we have a passcode, and userId is available
    const { data: employeeData, isLoading, isError } = useQuery({
        queryKey: [QUERY_KEYS.EMPLOYEE_BY_USER_ID, userId],
        queryFn: () => {
            if (!userId) {
                throw new Error("User ID is not available");
            }
            return getEmployeeByUserId(userId);
        },
        enabled: shouldQuery && storedValue.length > 0 && userId !== null,
        retry: false,
    });

    /**
     * Handles the submission of the passcode
     * Triggers the query to fetch employee data
     */
    const handleSubmit = () => {
        // Don't submit if value is empty or if already loading
        if (storedValue.length === 0 || isLoading) {
            return;
        }

        // Check if userId is available
        if (!userId) {
            toast.error("Sesión no válida. Por favor, inicia sesión nuevamente.");
            return;
        }

        // Trigger the query
        setShouldQuery(true);
    }

    // Check passcode when employee data changes or when query fails
    useEffect(() => {
        if (!shouldQuery) {
            return;
        }

        // Handle error case - query failed (likely no employee found)
        if (isError) {
            toast.error("No hay ningún usuario registrado con ese código de acceso");
            setShouldQuery(false);
            return;
        }

        // Check passcode when employee data is available
        if (employeeData) {
            const hasMatch = findMatchingPasscode(employeeData, storedValue);
            
            if (hasMatch) {
                // Passcode matches, navigate to next page
                router.push('/entry/baseUser');
                setShouldQuery(false);
                clearValue();
            } else {
                // No match found, show error toast
                toast.error("No hay ningún usuario registrado con ese código de acceso");
                setShouldQuery(false);
            }
        }
    }, [employeeData, isError, shouldQuery, storedValue, clearValue, isLoading]);

    return (

        <ThemedView style={styles.container}>
            <StatusBar style={isDark ? "light" : "dark"} />
            <ThemedView style={styles.inputContainer}>
                <ThemedView
                    style={[
                        styles.input,
                        {
                            borderColor: isDark ? Colors.dark.border : Colors.light.border,
                            backgroundColor: isDark ? Colors.dark.surface : Colors.light.surface,
                        },
                    ]}
                >
                    <ThemedText style={styles.inputText}>{storedValue}</ThemedText>
                </ThemedView>
            </ThemedView>

            <ThemedNumpad
                onNumberPress={setValue}
                onDelete={deleteValue}
                onClear={clearValue}
                style={styles.numpad}
            />

            <ThemedView style={styles.buttonContainer}>
                <ThemedButton 
                    title="Submit" 
                    onPress={handleSubmit} 
                    disabled={storedValue.length === 0 || isLoading || !userId} 
                    isLoading={isLoading}
                    style={styles.submitButton} 
                    variant={"primary"} 
                    size={"medium"} 
                />
            </ThemedView>
        </ThemedView>

    )
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        padding: 20,
        justifyContent: "center",
    },
    header: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        marginBottom: 24,
        paddingTop: Platform.OS === "ios" ? 40 : 16,
    },
    backButton: {
        padding: 8,
    },
    title: {
        fontSize: 24,
        textAlign: "center",
    },
    placeholder: {
        width: 50,
    },
    inputContainer: {
        alignItems: "center",
        marginBottom: 32,
    },
    input: {
        width: "100%",
        maxWidth: 400,
        height: 60,
        borderWidth: 1,
        borderRadius: 8,
        padding: 14,
        justifyContent: "center",
        alignItems: "center",
    },
    inputText: {
        fontSize: 28,
        letterSpacing: 2,
        fontWeight: "500",
        textAlign: "center",
        paddingTop: 6,
    },
    numpad: {
        marginBottom: 24,
    },
    buttonContainer: {
        alignItems: "center",
    },
    submitButton: {
        width: "100%",
        maxWidth: 400,
    },
})
