# [Book] - Annoucing Azure Bicep - Zero to Hero

> Many are struggling to make ends meet ever since the pandemic started. Therefore, I decided that all proceeds from this book will go to charity.

[Project Bicep](https://github.com/azure/bicep) is undoubtedly the best thing that happened in the Azure world, and I have been following the development and using Bicep quite often. I published a [series of articles](https://ravichaganti.com/series/azure-bicep/) on this blog around Bicep. However, there is always more. This series gave me an idea about a complete book on Bicep. And, today, I am announcing this new book project - [Azure Bicep - Zero to Hero](https://leanpub.com/azurebicep). This book is still a work in progress and 30% complete. I will be spending a few more weekends completing the rest of the chapters. You can read it as I complete and provide your feedback. Since this is a self-published book, all updates to the book will be free forever. 

### About the book

Azure Resource Manager (ARM) brought in a new deployment model to Microsoft Azure. Unlike the classic deployment model, ARM looks at groups of resources and manages the life cycle of these resource groups from end to end. ARM simplified how you built and managed services on Azure. Along with the ARM deployment model, Microsoft also introduced a new way of provisioning Azure services through Azure Resource Manager templates. These templates are based on JSON data representation and provided a declarative way to define your Azure infrastructure. ARM templates offer a great way to automate infrastructure provisioning and integrate well into the infrastructure as code practices. However, using JSON data representation for ARM template language makes it too complex to read and write more extensive infrastructure definitions. For users getting started with Azure infrastructure deployments, this can be a nightmare.

Enter Azure Bicep. Bicep language is a transparent abstraction over ARM template language. Azure Bicep files traspile to ARM templates. Bicep labguage is easy to learn and very simple to read and write. Being a transparent abstraction on top of ARM templates, Bicep supports the same resource types and properties. By building on top of resource specification API as the backend, Bicep enables day-zero support for any new resource introduced as an Azure service.

This book focuses on deploying and managing Azure infrastructure with Bicep and covers everything that you need to know right from basics to the advanced usage of Bicep language to create complex Azure infrastructure configurations and implementing continuous pipelines for your Azure infrastructure configurations.

This book covers:

- Introduction to Bicep
- Getting started with Bicep
- Working with resources
- Creating reusable Bicep files
- Variables and Expressions in Bicep
- Loops and Conditions in Bicep
- Creating and consuming Bicep modules
- Using Deployment scripts and Templates Spec with Bicep
- Testing and implementing CI/CD pipelines for your Azure infrastructure with Bicep
- A Bicep built-in function primer

Overall, this book takes your Azure Bicep knowledge from zero to hero and helps you master ARM template authoring using Bicep language.


