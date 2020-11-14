import * as React from 'react';
import { useDebounce } from '../hooks/useDebounce';

interface SearchContextValue {
    query: string;
    updateQuery: (newQuery: string) => void;
    error?: string;
    suggestions: string[];
    selectSuggestion: (suggestion: string) => void;
    isLoading: boolean;
    compound: any;
    onQuerySubmit: (manualQuery?: string) => Promise<void>;
}

const initialState: SearchContextValue = {
    query: '',
    updateQuery: () => {},
    suggestions: [],
    selectSuggestion: () => {},
    isLoading: false,
    compound: {},
    onQuerySubmit: async () => {}
};

export const SearchContext = React.createContext<SearchContextValue>(
    initialState
);

export function useSearchContext(): SearchContextValue {
    return React.useContext(SearchContext);
}

interface Coordinates {
    x: number;
    y: number;
    z: number;
}

interface Aids {
    first: any;
    second: any;
}

interface CompoundData {
    coords: Coordinates;
    aids: Aids;
    numOfBonds: number;
    elements: any;
    has3DModel: boolean;
}

interface CompoundInfo {
    cid?: number;
    name?: string;
    imageURL?: string;
    formula?: string;
    weight?: number;
    data?: CompoundData;
}

export function useCreateSearchContext(): SearchContextValue {
    const [query, setQuery] = React.useState('');
    const [isLoading, setIsLoading] = React.useState(false);
    const [error, setError] = React.useState<string | undefined>(undefined);
    const [suggestions, setSuggestions] = React.useState<string[]>([]);
    const [compound, setCompound] = React.useState<CompoundInfo | null>(null);

    const debouncedQuery = useDebounce({ value: query, delay: 500 });

    async function fetchSuggestions(): Promise<void> {
        const url = `https://pubchem.ncbi.nlm.nih.gov/rest/autocomplete/compound/${debouncedQuery}/json?limit=5`;
        try {
            const res = await fetch(url);
            const resJSON = await res.json();
            if (
                resJSON.total > 0 &&
                resJSON.dictionary_terms &&
                resJSON.dictionary_terms.compound
            ) {
                setSuggestions(resJSON.dictionary_terms.compound);
            } else {
                setSuggestions([]);
            }
        } catch (err) {
            setSuggestions([]);
            console.log(err);
        }
    }

    // Get search suggestions
    React.useEffect((): void => {
        // Reset error
        setError(undefined);
        if (debouncedQuery) {
            fetchSuggestions();
        }
    }, [debouncedQuery]);

    React.useEffect((): void => {
        if (!query) {
            setSuggestions([]);
        }
    }, [query]);

    // Gets the compound ID. We must get the CID before requesting any
    // additional data. This also helps us check if the query is a valid
    // compound name.
    async function requestCompoundID(
        query: string
    ): Promise<number | undefined> {
        let cid: number | undefined;
        try {
            const url = `https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/name/${query}/record/JSON/`;
            let res = await fetch(url);
            let resJSON = await res.json();
            if (!resJSON.Fault && resJSON.PC_Compounds?.[0]?.id?.id) {
                cid = resJSON.PC_Compounds[0].id.id.cid;
            }
        } catch (err) {
            console.log(err);
        }
        setCompound({
            ...compound,
            cid
        });
        return cid;
    }

    async function requestCompoundName(cid: number): Promise<void> {
        let name: string | undefined;
        try {
            const url = `https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/cid/${cid}/description/JSON`;
            const res = await fetch(url);
            const resJSON = await res.json();
            if (resJSON.InformationList?.Information?.[0]) {
                name = resJSON.InformationList.Information[0].Title;
            }
        } catch (err) {
            console.log(err);
        }
        setCompound({ ...compound, name });
    }

    async function requestCompoundFormulaAndWeight(cid: number): Promise<void> {
        let formula: string | undefined;
        let weight: number | undefined;
        try {
            const url = `https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/cid/${cid}/property/MolecularFormula,MolecularWeight/JSON/`;
            const res = await fetch(url);
            const resJSON = await res.json();
            const properties = resJSON.PropertyTable?.Properties?.[0];
            if (properties) {
                formula = properties.MolecularFormula;
                weight = properties.MolecularWeight;
            }
        } catch (err) {
            console.log(err);
        }
        setCompound({
            ...compound,
            formula,
            weight
        });
    }

    async function requestCompoundData(cid: number): Promise<void> {
        let compoundData: CompoundData | undefined;
        try {
            const url = `https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/cid/${cid}/record/JSON/?record_type=3d&response_type=display`;
            const res = await fetch(url);
            const resJSON = await res.json();
            const compound = resJSON.PC_Compounds[0];
            if (resJSON.PC_Compounds) {
                const { x, y, z } = compound.coords[0].conformers[0];
                compoundData = {
                    coords: { x, y, z },
                    aids: {
                        first: compound.bonds.aid1,
                        second: compound.bonds.aid2
                    },
                    numOfBonds: compound.bonds.order,
                    elements: compound.atoms.element,
                    has3DModel: true
                };
            }
        } catch (error) {
            console.log(error);
        }
        setCompound({
            ...compound,
            data: compoundData
        });
    }

    function requestModel2DImageURL(cid: number): void {
        const imageURL = `https://pubchem.ncbi.nlm.nih.gov/image/imagefly.cgi?cid=${cid}&width=300&height=300`;
        setCompound({
            ...compound,
            imageURL
        });
    }

    // Fetches all information needed about a compound.
    // A manualQuery can be used for search suggestions to bypass the
    // wait for the query state to update.
    // TODO(brandon): Make this cleaner by removing this manualQuery param.
    async function requestCompound(manualQuery?: string): Promise<void> {
        setIsLoading(true);
        // We use query and not debouncedQuery here because the
        // debouncedQuery might be slightly outdated.
        const cid: number | undefined = await requestCompoundID(
            manualQuery || query
        );
        if (cid === undefined) {
            setCompound(null);
        } else {
            await Promise.all([
                requestCompoundName(cid),
                requestCompoundData(cid),
                requestCompoundFormulaAndWeight(cid),
                requestModel2DImageURL(cid)
            ]);
        }
        setIsLoading(false);
    }

    function selectSuggestion(suggestion: string): void {
        // Setting the query to '' will clear the suggestions
        setQuery('');
        requestCompound(suggestion);
    }

    return {
        query,
        updateQuery: (newQuery: string): void => setQuery(newQuery),
        error,
        suggestions,
        selectSuggestion,
        isLoading,
        compound,
        onQuerySubmit: requestCompound
    };
}