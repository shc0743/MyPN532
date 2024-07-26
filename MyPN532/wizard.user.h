#pragma once
#include <Windows.h>
#include<map>


// types
DECLARE_HANDLE(HMPRGOBJ); // Handle: MyProgressWizard Object
DECLARE_HANDLE(HMPRGWIZ); // Handle: MyProgressWizard Wizard

enum class MPRG_WIZARD_EXTENSIBLE_ATTRIBUTES {
	NotApplicable = 0,
	WizAttrTopmost = 0x1001,
	WizAttrUnresizable = 0x1002,
	WizAttrCancelHandler = 0x8001,
};

class MPRG_CREATE_PARAMS {
public:
	size_t cb;

	long width, height;
	int type;
	PCWSTR szTitle;
	PCWSTR szText;
	HWND hParentWindow;

	size_t max, value;

};
class MPRG_WIZARD_DATA {
public:
	size_t cb;

	long width, height;
	int type;

	std::map<MPRG_WIZARD_EXTENSIBLE_ATTRIBUTES, LONG_PTR>* attrs;

	size_t max, value;
	PCWSTR szText;

	HWND hwTipText, hwProgBar, hwCancelBtn;
};
using PMPRG_WIZARD_DATA = MPRG_WIZARD_DATA*;

using TMprgCancelHandler = bool(__stdcall*) (HMPRGWIZ hWiz, HMPRGOBJ hObj);




// methods
bool InitMprgComponent();

extern "C" { PCWSTR GetMprgVersion(); }

extern "C" {

HMPRGOBJ CreateMprgObject();
HMPRGWIZ CreateMprgWizard(HMPRGOBJ hObject, MPRG_CREATE_PARAMS params, DWORD dwTimeout = 30000);

HWND GetMprgHwnd(HMPRGWIZ hWizard);
const PMPRG_WIZARD_DATA GetMprgWizardData(HMPRGWIZ hWizard);
PMPRG_WIZARD_DATA GetModifiableMprgWizardData(HMPRGWIZ hWizard);
bool UpdateMprgWizard(HMPRGWIZ hWizard);

LONG_PTR GetMprgWizAttribute(HMPRGWIZ hWizard,
	MPRG_WIZARD_EXTENSIBLE_ATTRIBUTES nAttrName);
LONG_PTR SetMprgWizAttribute(HMPRGWIZ hWizard,
	MPRG_WIZARD_EXTENSIBLE_ATTRIBUTES nAttrName,
	LONG_PTR newValue);

bool SetMprgWizardValue(HMPRGWIZ hWizard, size_t currentValue, bool bForceUpdate = true);
bool SetMprgWizardValue_Efficiency(HMPRGOBJ hObject, HMPRGWIZ hWizard, size_t currentValue); // not implented

bool StepMprgWizardValue(HMPRGWIZ hWizard, bool bForceUpdate = true);

bool SetMprgWizardText(HMPRGWIZ hWizard, PCWSTR psz, bool bForceUpdate = true);

bool OpenMprgWizard(HMPRGWIZ hWizard, int nShow = SW_NORMAL);
bool HideMprgWizard(HMPRGWIZ hWizard);
//bool ResetMprgWizard(HMPRGWIZ hWizard);

bool DestroyMprgWizard(HMPRGOBJ hObject, HMPRGWIZ hWizard);
DWORD DeleteMprgObject(HMPRGOBJ hObject, bool bForceTerminateIfTimeout = true);

HMPRGOBJ GetMprgObjectByWizard(HMPRGWIZ hWizard);

}

