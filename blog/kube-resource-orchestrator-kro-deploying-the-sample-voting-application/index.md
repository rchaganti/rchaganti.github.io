# Kube Resource Orchestrator (KRO) - Deploying the sample voting application


In today's article, you will build upon what you learned in the earlier article about the [basics](https://cloudnativecentral.com/posts/kube-resource-orchestrator-the-basics/) of `kro`. To demonstrate a few more `kro` concepts, we will use the famous [sample voting](https://github.com/dockersamples/example-voting-app) application.

![Sample voting app](https://github.com/dockersamples/example-voting-app/raw/main/architecture.excalidraw.png)

While not very complex, this application has enough moving parts to define dependencies. In this article, we shall look at the custom API needed to instantiate this voting application on Kubernetes. In this example, we must bring up the `redis` and `db` services as `ClusterIP` services before the `vote` and `result` services, which are `NodePort` type. 

First, let us define the schema for all input parameters.

```yaml
apiVersion: kro.run/v1alpha1
kind: ResourceGraphDefinition
metadata:
  name: voteapplication
spec:
  schema:
    apiVersion: v1alpha1
    kind: VoteApplication
    spec:
      name: string
      redis:
        name: string | default="redis" 
        svcName: string | default="redis"
        imageName: string | default="redis:alpine"
        port: integer | default=6379
      db:
        name: string | default="db"
        svcName: string | default="db"
        imageName: string | default="postgres:15-alpine"
        userName: string | default="postgres"
        password: string | default="postgres"
        port: integer | default=5432
      worker:
        name: string | default="worker"
        imageName: string | default="dockersamples/examplevotingapp_worker"
      vote:
        name: string | default="vote"
        imageName: string | default="dockersamples/examplevotingapp_vote"
        port: integer | default=80
        nodePort: integer | default=31000
        svcName: string | default="vote"
      result:
        name: string | default="result"
        imageName: string | default="dockersamples/examplevotingapp_result"
        port: integer | default=80
        nodePort: integer | default=31001
        svcName: string | default="result"
    status: {}
```

To deploy the containers as pods, we must define `name`, `imageName`, and `port`. We also need `svcName` and `nodePort` as input values for services associated with these deployments. For now, let us leave the `status` field empty. We will this later. Let us now look at the `redis` deployment and service.

```yaml
  resources:
    - id: redisDeployment
      template:
        apiVersion: apps/v1
        kind: Deployment
        metadata:
          name: ${schema.spec.redis.name}
        spec:
          replicas: 1
          selector:
            matchLabels:
              app: ${schema.spec.redis.name}
          template:
            metadata:
              labels:
                app: ${schema.spec.redis.name}
            spec:
              containers:
              - name: ${schema.spec.redis.name}
                image: ${schema.spec.redis.imageName}
                ports:
                  - containerPort: ${schema.spec.redis.port}
    - id: redisService
      template:
        apiVersion: v1
        kind: Service
        metadata:
          name: ${schema.spec.redis.svcName}
        spec:
          selector: ${redisDeployment.spec.selector.matchLabels}
          ports:
            - protocol: TCP
              port: ${schema.spec.redis.port}
              targetPort: ${schema.spec.redis.port}
```

By using `selector: ${redisDeployment.spec.selector.matchLabels}`, we define an explicit dependency on `redisDeployment`. The next resources are the `db` deployment and service.

```yaml
    - id: dbDeployment
      template:
        apiVersion: apps/v1
        kind: Deployment
        metadata:
          name: ${schema.spec.db.name}
        spec:
          replicas: 1
          selector:
            matchLabels:
              app: ${schema.spec.db.name}
          template:
            metadata:
              labels:
                app: ${schema.spec.db.name}
            spec:
              containers:
              - name: ${schema.spec.db.name}
                image: ${schema.spec.db.imageName}
                env:
                - name: POSTGRES_USER
                  value: ${schema.spec.db.userName}
                - name: POSTGRES_PASSWORD
                  value: ${schema.spec.db.password}
                ports:
                  - containerPort: ${schema.spec.db.port}
    - id: dbService
      template:
        apiVersion: v1
        kind: Service
        metadata:
          name: ${schema.spec.db.svcName}
        spec:
          selector: ${dbDeployment.spec.selector.matchLabels}
          ports:
            - protocol: TCP
              port: ${schema.spec.db.port}
              targetPort: ${schema.spec.db.port}
```

Note that the `redis` and `db` service names must be `redis` and `db,` respectively. These names are hard-coded in the application code.

The next set of deployments and services are `worker`, `vote`, and `result`.

```yaml
    - id: workerDeployment
      template:
        apiVersion: apps/v1
        kind: Deployment
        metadata:
          name: ${schema.spec.worker.name}
        spec:
          replicas: 1
          selector:
            matchLabels:
              app: ${schema.spec.worker.name}
          template:
            metadata:
              labels:
                app: ${schema.spec.worker.name}
            spec:
              containers:
              - name: ${schema.spec.worker.name}
                image: ${schema.spec.worker.imageName}
    - id: voteDeployment
      template:
        apiVersion: apps/v1
        kind: Deployment
        metadata:
          name: ${schema.spec.vote.name}
        spec:
          replicas: 1
          selector:
            matchLabels:
              app: ${schema.spec.vote.name}
          template:
            metadata:
              labels:
                app: ${schema.spec.vote.name}
            spec:
              containers:
              - name: ${schema.spec.vote.name}
                image: ${schema.spec.vote.imageName}
    - id: voteService
      template:
        apiVersion: v1
        kind: Service
        metadata:
          name: ${schema.spec.vote.svcName}
        spec:
          type: NodePort
          selector: ${voteDeployment.spec.selector.matchLabels}
          ports:
            - protocol: TCP
              port: ${schema.spec.vote.port}
              targetPort: ${schema.spec.vote.port}
              nodePort: ${schema.spec.vote.nodePort}
    - id: resultDeployment
      template:
        apiVersion: apps/v1
        kind: Deployment
        metadata:
          name: ${schema.spec.result.name}
        spec:
          replicas: 1
          selector:
            matchLabels:
              app: ${schema.spec.result.name}
          template:
            metadata:
              labels:
                app: ${schema.spec.result.name}
            spec:
              containers:
              - name: ${schema.spec.result.name}
                image: ${schema.spec.result.imageName}
    - id: resultService
      template:
        apiVersion: v1
        kind: Service
        metadata:
          name: ${schema.spec.result.svcName}
        spec:
          type: NodePort
          selector: ${resultDeployment.spec.selector.matchLabels}
          ports:
            - protocol: TCP
              port: ${schema.spec.result.port}
              targetPort: ${schema.spec.result.port}
              nodePort: ${schema.spec.result.nodePort}
```

The `worker` deployment does not need any service. However, the end-user accesses the `vote` and `result` in pods and, therefore, requires the `NodePort` service.

This resource group definition can be deployed using the `kubectl apply` command.

```shell
$ kubectl apply -f vote-rgd.yaml
```

As we do not need to change any input values to create an instance, we can use the following instance definition to create an instance of the custom API.

```yaml
apiVersion: kro.run/v1alpha1
kind: VoteApplication
metadata:
  name: my-vote-1
spec:
  name: my-vote-1
  redis: {}
  db: {}
  worker: {}
  vote: {}
  result: {}
```

Again, this can be deployed using the `kubectl apply` command.

```shell
$ kubectl apply -f vote_instance.yaml
```

This is a good start. But, how do we make this more dynamic so that we can use it across multiple environments such as dev, staging, and production. This will the topic of our next article in this series.

